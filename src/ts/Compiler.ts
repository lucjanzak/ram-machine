import {
  Instruction,
  isPartOfArray,
  JUMP_INSTRUCTIONS,
  NO_OPERAND_INSTRUCTIONS,
  READABLE_OPERAND_INSTRUCTIONS,
  ReadableOperand,
  WRITEABLE_OPERAND_INSTRUCTIONS,
  WriteableOperand,
} from "./Instruction";
import { ParsedLine, Tile } from "./Program";
import { CompilerError, CompilerException, ParserError, ParserException, PreprocessorError } from "./CompileError";
import {
  InputTapeUnderflowBehavior,
  MachineSettings,
  ProgramCounterOutOfBoundsBehavior,
  UninitializedRegisterReadBehavior,
} from "./Settings";
import { Dialogs, select, Templates, useTemplate } from "./Nodes";
import { assertNever } from "./Util";
import { formatString, t } from "./Localization";
import { goToLine, highlightLine } from "./MonacoEditor";

export type MessageSeverity = "error" | "warning";

export type CompilerMessage = {
  type: MessageSeverity;
  body: CompilerError;
  line?: number;
  col?: number;
};

export type PreprocessorState = {
  inputTapeString: string | null;
  inputTapeUnderflow: InputTapeUnderflowBehavior | null;
  uninitializedRegisterRead: UninitializedRegisterReadBehavior | null;
  programCounterOutOfBounds: ProgramCounterOutOfBoundsBehavior | null;
};

export type CompilerSettings = {
  allowNegativeImmediate: boolean;
};

export class Compiler {
  parseBigInt(operand: string): bigint {
    if (operand.trim() === "") {
      throw new ParserException(ParserError.bigintExpected());
    }

    try {
      return BigInt(operand);
    } catch (e) {
      throw new ParserException(ParserError.bigintParseError(operand));
    }
  }

  parseAnyOperand(operand: string): ReadableOperand {
    if (operand.startsWith("=")) {
      const value = this.parseBigInt(operand.slice(1));

      if (!this.settings.allowNegativeImmediate && value < 0)
        throw new ParserException(ParserError.negativeImmediate());
      return {
        type: "immediate",
        value,
      };
    } else if (operand.startsWith("*")) {
      const value = this.parseBigInt(operand.slice(1));
      if (value < 0) throw new ParserException(ParserError.negativeRegister());
      return {
        type: "indirect",
        value,
      };
    } else {
      const value = this.parseBigInt(operand);
      if (value < 0) throw new ParserException(ParserError.negativeRegister());
      return {
        type: "register",
        value: BigInt(operand),
      };
    }
  }

  parseWriteableOperand(operand: string): WriteableOperand {
    const parsed = this.parseAnyOperand(operand);
    const parsedType = parsed.type;
    if (parsedType === "immediate") {
      throw new ParserException(ParserError.immediateWritableOperand());
    }
    const converted = {
      type: parsedType,
      value: parsed.value,
    };
    return converted;
  }

  parseInstruction(mnemonic: string, operand: string): Instruction | null {
    if (isPartOfArray(mnemonic, READABLE_OPERAND_INSTRUCTIONS)) {
      return {
        operation: mnemonic,
        operand: this.parseAnyOperand(operand),
      };
    } else if (isPartOfArray(mnemonic, WRITEABLE_OPERAND_INSTRUCTIONS)) {
      return {
        operation: mnemonic,
        operand: this.parseWriteableOperand(operand),
      };
    } else if (isPartOfArray(mnemonic, JUMP_INSTRUCTIONS)) {
      if (operand === "") {
        throw new ParserException(ParserError.labelExpected());
      }
      return {
        operation: mnemonic,
        label: operand,
      };
    } else if (isPartOfArray(mnemonic, NO_OPERAND_INSTRUCTIONS)) {
      if (operand !== "") {
        throw new ParserException(ParserError.unexpectedOperand(operand));
      }
      return {
        operation: mnemonic,
      };
    } else {
      throw new ParserException(ParserError.unrecognizedMnemonic(mnemonic));
    }
  }

  parseAssemblyLine(line: string): ParsedLine {
    // const regex = /^\s*(([\w\d]+)\s*:\s*)?((\w+)\s+([\w\d]+)\s*)?(;(.*))?$/;
    // const results = regex.exec(line);
    // if (results === null) {
    //   throw new SyntaxError("assembly syntax error");
    // }

    const [lineWithoutComment, ...commentSegments] = line.split(";");
    const comment = commentSegments.length > 0 ? commentSegments.join(";") : null;
    const [lineWithoutLabel, ...labelSegments] = lineWithoutComment.split(":").toReversed();
    const labels = labelSegments.toReversed().map((segment) => segment.trim().toLowerCase());
    labels.forEach((label) => {
      if (label.length === 0) {
        throw new ParserException(ParserError.emptyLabel());
      }
      if (!/^\s*[\p{L}_][\p{L}_0-9\s]*$/u.test(label)) {
        throw new ParserException(ParserError.invalidLabel(label));
      }
    });
    const [mnemonicSegment, ...operandSegments] = lineWithoutLabel.trim().split(/\s+/);
    const mnemonic = mnemonicSegment.trim().toUpperCase();
    const operand = operandSegments.join(" ").trim(); // TODO(bug): this doesn't preserve the operand exactly; the original operand could've been separated by tabs for example, or varying levels of spaces.
    const instruction = mnemonic.length > 0 ? this.parseInstruction(mnemonic, operand) : null;
    return {
      labels,
      instruction,
      comment,
    };
  }

  parsePreprocessorDirective(line: string, lineIndex: number, state: PreprocessorState, messages: CompilerMessage[]) {
    // ;.INPUT_TAPE 12,31,231,23,123
    // ;.SET INPUT_TAPE_UNDERFLOW zero
    // ;.SET UNINITIALIZED_REGISTER_READ random
    // ;.SET PROGRAM_COUNTER_OUT_OF_BOUNDS actAsHalt

    const preprocessorWarn = (msg: PreprocessorError) => {
      const lineNumber = lineIndex + 1;
      const body = Object.assign(msg, { category: "preprocessor" as const });
      messages.push({
        type: "warning",
        body,
        line: lineNumber,
      });
    };

    const directive = line.slice(2).trim();
    let [commandName, remaining, _] = directive.split(/\s+(.*)/s);
    commandName = commandName.toUpperCase();

    if (commandName.trim() === "") {
      preprocessorWarn(PreprocessorError.expectedDirective());
    } else if (commandName === "INPUT_TAPE") {
      state.inputTapeString = remaining;
    } else if (commandName === "SET") {
      if (remaining === undefined || remaining.trim() === "") {
        preprocessorWarn(PreprocessorError.expectedArguments());
        return;
      }

      let [settingKey, settingValue, _] = remaining.split(/\s+(.*)/s);
      settingKey = settingKey.toUpperCase();
      if (settingKey === "INPUT_TAPE_UNDERFLOW") {
        if (settingValue === undefined || settingValue.trim() === "") {
          preprocessorWarn(PreprocessorError.setMissingValue(settingKey));
          return;
        }
        const parsed = MachineSettings.parseInputTapeUnderflowBehavior(settingValue);
        if (parsed === null) {
          preprocessorWarn(
            PreprocessorError.setInvalidValue("INPUT_TAPE_UNDERFLOW", settingValue, ["error", "zero", "random"])
          );
          return;
        }

        state.inputTapeUnderflow = parsed;
      } else if (settingKey === "UNINITIALIZED_REGISTER_READ") {
        if (settingValue === undefined || settingValue.trim() === "") {
          preprocessorWarn(PreprocessorError.setMissingValue(settingKey));
          return;
        }
        const parsed = MachineSettings.parseUninitializedRegisterReadBehavior(settingValue);
        if (parsed === null) {
          preprocessorWarn(
            PreprocessorError.setInvalidValue("UNINITIALIZED_REGISTER_READ", settingValue, [
              "error",
              "zero",
              "random",
              "superpositionCollapse",
            ])
          );
          return;
        }

        state.uninitializedRegisterRead = parsed;
      } else if (settingKey === "PROGRAM_COUNTER_OUT_OF_BOUNDS") {
        if (settingValue === undefined || settingValue.trim() === "") {
          preprocessorWarn(PreprocessorError.setMissingValue(settingKey));
          return;
        }
        const parsed = MachineSettings.parseProgramCounterOutOfBoundsBehavior(settingValue);
        if (parsed === null) {
          preprocessorWarn(
            PreprocessorError.setInvalidValue("PROGRAM_COUNTER_OUT_OF_BOUNDS", settingValue, ["error", "actAsHalt"])
          );
          return;
        }

        state.programCounterOutOfBounds = parsed;
      } else {
        preprocessorWarn(PreprocessorError.setInvalidKey(settingKey));
      }
    } else {
      preprocessorWarn(PreprocessorError.unknownDirective(commandName));
    }
  }

  compile(assemblyText: string): {
    success: boolean;
    tiles: Tile[];
    messages: CompilerMessage[];
    preprocessorState: PreprocessorState;
  } {
    const lines = assemblyText.split("\n");
    const tiles: Tile[] = [];
    const messages: CompilerMessage[] = [];
    let success = true;

    const definedLabels = new Map<string, number>();
    const defineNewLabel = (label: string, sourceLineNumber: number) => {
      const originalLine = definedLabels.get(label);
      if (originalLine !== undefined) {
        throw new ParserException(ParserError.redefinedLabel(originalLine, label));
      }
      definedLabels.set(label, sourceLineNumber);
    };

    let leftoverCommentLines: string[] = [];
    let leftoverLabels: { label: string; lineIndex: number }[] = [];
    const preprocessorState: PreprocessorState = {
      inputTapeString: null,
      inputTapeUnderflow: null,
      uninitializedRegisterRead: null,
      programCounterOutOfBounds: null,
    };

    const processLine = (line: string, lineIndex: number) => {
      if (line.startsWith(";.")) {
        this.parsePreprocessorDirective(line, lineIndex, preprocessorState, messages);
        return;
      }

      const parsed = this.parseAssemblyLine(line);

      parsed.labels.forEach((label) => defineNewLabel(label, lineIndex + 1));
      leftoverLabels = leftoverLabels.concat(
        parsed.labels.map((x) => ({
          label: x,
          lineIndex,
        }))
      );

      if (parsed.instruction !== null) {
        // push new comment tile if there were leftover comment lines
        if (leftoverCommentLines.length > 0) {
          tiles.push({
            type: "comment",
            comment: leftoverCommentLines.join("\n"),
          });
          leftoverCommentLines = [];
        }

        // push new instruction tile
        tiles.push({
          type: "instruction",
          comment: parsed.comment,
          instruction: parsed.instruction,
          labels: leftoverLabels.map((x) => x.label),
        });
        leftoverLabels = [];
      } else {
        if (parsed.comment !== null) {
          leftoverCommentLines.push(parsed.comment);
        }
      }
    };

    lines.forEach((line, lineIndex) => {
      try {
        processLine(line, lineIndex);
      } catch (ex) {
        if (ex instanceof CompilerException) {
          success = false;
          messages.push({
            type: "error",
            body: ex.msg,
            line: lineIndex + 1,
          });
        } else {
          throw ex;
        }
      }
    });

    // push new comment tile if there were leftover comment lines
    if (leftoverCommentLines.length > 0) {
      tiles.push({
        type: "comment",
        comment: leftoverCommentLines.join("\n"),
      });
    }

    leftoverLabels.forEach((x) => {
      messages.push({
        type: "warning",
        body: Object.assign({ category: "parser" as const }, ParserError.labelAtTheEnd(x.label)),
        line: x.lineIndex + 1,
      });
    });

    return { success, tiles, messages, preprocessorState };
  }

  static defaultSettings(): CompilerSettings {
    return {
      // TODO(optional): I don't know if it should be allowed to use negative literals, or if it should report an error. For now, this is allowed.
      // If this is ever changed, it also needs to be changed in the Monaco language definition.
      allowNegativeImmediate: true,
    };
  }

  constructor(private readonly settings = Compiler.defaultSettings()) {}
}

export function makeStatusBox(message: string, type: "error" | "warning" | "success"): DocumentFragment {
  const f = useTemplate(Templates.statusBox);

  const box = select(f, ".status-box");
  box.classList.add(type);

  const messageSpan = select(f, ".message");
  messageSpan.textContent = message;
  return f;
}

export function getTitleForMessageBox(category: CompilerError["category"] | "runtime") {
  if (category === "preprocessor") {
    return `${t.compiler.preprocessorErrorTitle}`;
  } else if (category === "parser") {
    return `${t.compiler.parserErrorTitle}`;
  } else if (category === "runtime") {
    return `${t.runtime.runtimeErrorTitle}`;
  } else {
    assertNever(category);
  }
}

export function makeCompilerMessageBox(msg: CompilerMessage): DocumentFragment {
  const f = useTemplate(Templates.compilerMessage);

  const box = select(f, ".compiler-message");
  box.classList.add(msg.type);

  const titleSpan = select(f, ".title");
  titleSpan.textContent = getTitleForMessageBox(msg.body.category);

  const errorIdSpan = select(f, ".error-id");
  errorIdSpan.textContent = `<${msg.body.id}>`;

  const messageSpan = select(f, ".message");
  messageSpan.textContent = `${msg.body.message}`;

  const lineLocation = select(f, ".line-location");
  lineLocation.textContent =
    msg.line === undefined
      ? ""
      : msg.col === undefined
      ? formatString(t.compiler.atLine, `${msg.line}`)
      : formatString(t.compiler.atLineCol, `${msg.line}`, `${msg.col}`);
  if (msg.line !== undefined) {
    const line = msg.line;
    const col = msg.col;
    lineLocation.addEventListener("click", () => {
      if (Dialogs.loadFile.open) {
        Dialogs.loadFile.close();
      }
      goToLine(line, col);
      const highlightError = false;
      if (highlightError) {
        highlightLine(line, msg.body.message, "editor-highlight-error-line");
      }
    });
  }
  return f;
}

export function makeRuntimeMessageBox(
  message: string,
  id: string,
  type: "error" | "warning" | "success"
): DocumentFragment {
  const f = useTemplate(Templates.runtimeMessage);

  const box = select(f, ".runtime-message");
  box.classList.add(type);

  const titleSpan = select(f, ".title");
  titleSpan.textContent = getTitleForMessageBox("runtime");

  const errorIdSpan = select(f, ".error-id");
  errorIdSpan.textContent = `<${id}>`;

  const messageSpan = select(f, ".message");
  messageSpan.textContent = `${message}`;

  return f;
}

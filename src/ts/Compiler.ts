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
import { CompilerError, ParserError, PreprocessorError } from "./CompileError";
import {
  InputTapeUnderflowBehavior,
  MachineSettings,
  ProgramCounterOutOfBoundsBehavior,
  UninitializedRegisterReadBehavior,
} from "./Settings";

export type CompilerMessage = {
  type: "error" | "warning";
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

class CompilerException {
  constructor(public readonly msg: CompilerError) {}
}

class ParserException extends CompilerException {
  constructor(msg: ParserError) {
    super(Object.assign(msg, { category: "parser" as const }));
  }
}
class PreprocessorException extends CompilerException {
  constructor(msg: PreprocessorError) {
    super(Object.assign(msg, { category: "preprocessor" as const }));
  }
}

export type CompilerSettings = {
  allowNegativeImmediate: boolean;
};

export class Compiler {
  parseBigInt(operand: string): bigint {
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
      return {
        operation: mnemonic,
        label: operand,
      };
    } else if (isPartOfArray(mnemonic, NO_OPERAND_INSTRUCTIONS)) {
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

    if (commandName === "INPUT_TAPE") {
      state.inputTapeString = remaining;
    } else if (commandName === "SET") {
      let [settingKey, settingValue, _] = remaining.split(/\s+(.*)/s);
      settingKey = settingKey.toUpperCase();
      if (settingKey === "INPUT_TAPE_UNDERFLOW") {
        const parsed = MachineSettings.parseInputTapeUnderflowBehavior(settingValue);
        if (parsed === null) preprocessorWarn(PreprocessorError.setInvalidValue("INPUT_TAPE_UNDERFLOW", settingValue));
        else state.inputTapeUnderflow = parsed;
      } else if (settingKey === "UNINITIALIZED_REGISTER_READ") {
        const parsed = MachineSettings.parseUninitializedRegisterReadBehavior(settingValue);
        if (parsed === null)
          preprocessorWarn(PreprocessorError.setInvalidValue("UNINITIALIZED_REGISTER_READ", settingValue));
        else state.uninitializedRegisterRead = parsed;
      } else if (settingKey === "PROGRAM_COUNTER_OUT_OF_BOUNDS") {
        const parsed = MachineSettings.parseProgramCounterOutOfBoundsBehavior(settingValue);
        if (parsed === null)
          preprocessorWarn(PreprocessorError.setInvalidValue("PROGRAM_COUNTER_OUT_OF_BOUNDS", settingValue));
        else state.programCounterOutOfBounds = parsed;
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
    let leftoverLabels: string[] = [];
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
      leftoverLabels = leftoverLabels.concat(parsed.labels);

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
          labels: leftoverLabels,
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

    return { success, tiles, messages, preprocessorState };
  }

  static defaultSettings(): CompilerSettings {
    return {
      // TODO: I don't know if it should be allowed to use negative literals, or if it should report an error. For now, this is allowed.
      // If this is ever changed, it also needs to be changed in the Monaco language definition.
      allowNegativeImmediate: true,
    };
  }

  constructor(private readonly settings = Compiler.defaultSettings()) {}
}

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
import { assertNever } from "./Util";
import { ParsedLine, Tile } from "./Program";

export class Parser {
  constructor(private hideErrors = false, private unknownMnemonics: "actAsHalt" | "actAsNoInstruction" | "forbid" = "forbid") {}

  parseBigInt(operand: string): bigint {
    return BigInt(operand);
  }

  parseAnyOperand(operand: string): ReadableOperand {
    if (operand.startsWith("=")) {
      const value = this.parseBigInt(operand.slice(1));
      // if (value < 0) throw new Error("immediate value cannot be negative"); // TODO
      return {
        type: "immediate",
        value,
      };
    } else if (operand.startsWith("*")) {
      const value = this.parseBigInt(operand.slice(1));
      if (value < 0) throw new Error("register number cannot be negative");
      return {
        type: "indirect",
        value,
      };
    } else {
      const value = this.parseBigInt(operand);
      if (value < 0) throw new Error("register number cannot be negative");
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
      throw new Error("immediate operand is not allowed in this instruction");
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
      if (this.unknownMnemonics === "forbid") {
        throw new Error(`unrecognized mnemonic: '${mnemonic}'`);
      } else if (this.unknownMnemonics === "actAsHalt") {
        return { operation: "HALT" };
      } else if (this.unknownMnemonics === "actAsNoInstruction") {
        return null;
      }
      assertNever(this.unknownMnemonics);
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
        throw new Error("label cannot be empty");
      }
    });
    const [mnemonicSegment, ...operandSegments] = lineWithoutLabel.trim().split(/\s+/);
    const mnemonic = mnemonicSegment.trim().toUpperCase();
    const operand = operandSegments.join(" ").trim(); // TODO: this doesn't preserve the operand exactly; the original operand could've been separated by tabs for example
    const instruction = mnemonic.length > 0 ? this.parseInstruction(mnemonic, operand) : null;
    return {
      labels,
      instruction,
      comment,
    };
  }

  parseAssemblyProgram(assemblyText: string): Tile[] {
    const lines = assemblyText.split("\n");
    const tiles: Tile[] = [];

    const definedLabels = new Map<string, number>();
    function defineNewLabel(label: string, sourceLineNumber: number) {
      if (definedLabels.has(label)) {
        const originalLine = definedLabels.get(label);
        throw new Error(`label was already defined at line ${originalLine}: '${label}'`);
      }
      definedLabels.set(label, sourceLineNumber);
    }

    let leftoverCommentLines: string[] = [];
    let leftoverLabels: string[] = [];

    function processLine(line: string, lineIndex: number) {
      // console.log(`Processing line #${lineIndex + 1}: '${line}'`);
      const parser = new Parser();
      const parsed = parser.parseAssemblyLine(line);
      // console.log("Parsed line: ", parsed);

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
    }

    lines.forEach((line, lineIndex) => {
      try {
        processLine(line, lineIndex);
      } catch (e) {
        if (!this.hideErrors) {
          console.warn(`Error while parsing line #${lineIndex + 1}:`, e);
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

    return tiles;
  }
}

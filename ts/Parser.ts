namespace Parser {
  function parseBigInt(operand: string): bigint {
    return BigInt(operand);
  }

  function parseAnyOperand(operand: string): ReadableOperand {
    if (operand.startsWith("=")) {
      const value = parseBigInt(operand.slice(1));
      // if (value < 0) throw new Error("immediate value cannot be negative"); // TODO
      return {
        type: "immediate",
        value,
      };
    } else if (operand.startsWith("*")) {
      const value = parseBigInt(operand.slice(1));
      if (value < 0) throw new Error("register number cannot be negative");
      return {
        type: "indirect",
        value,
      };
    } else {
      const value = parseBigInt(operand);
      if (value < 0) throw new Error("register number cannot be negative");
      return {
        type: "register",
        value: BigInt(operand),
      };
    }
  }

  function parseWriteableOperand(operand: string): WriteableOperand {
    const parsed = parseAnyOperand(operand);
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

  function parseInstruction(mnemonic: string, operand: string): Instruction {
    if (isPartOfArray(mnemonic, READABLE_OPERAND_INSTRUCTIONS)) {
      return {
        operation: mnemonic,
        operand: parseAnyOperand(operand),
      };
    } else if (isPartOfArray(mnemonic, WRITEABLE_OPERAND_INSTRUCTIONS)) {
      return {
        operation: mnemonic,
        operand: parseWriteableOperand(operand),
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
      // console.warn(`unrecognized mnemonic: '${mnemonic}'`);
      throw new Error(`unrecognized mnemonic: '${mnemonic}'`);
    }
  }

  export function parseAssemblyLine(line: string): ParsedLine {
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
    const instruction = mnemonic.length > 0 ? parseInstruction(mnemonic, operand) : null;
    return {
      labels,
      instruction,
      comment,
    };
  }
}

import { Instruction, ReadableOperand } from "./Instruction";
import { assertNever } from "./Util";

function lengthOfNumberDecimal(value: bigint) {
  if (value === 0n) return 1n;
  if (value < 0n) value = -value;

  let a = 0n;
  while (value !== 0n) {
    value = value / 10n;
    a++;
  }
  return a;
}

// c(i): contents of register with index `i`

// l(i): "length" of number `i`
function lengthOfNumber(i: bigint) {
  if (i === 0n) return 1n;
  if (i < 0n) i = -i;

  let result = 0n;
  while (i !== 0n) {
    i = i / 2n;
    result++;
  }
  return result;
}

// t(a): operand complexity
function operandComplexity(op: ReadableOperand, c: (i: bigint) => bigint) {
  const l = lengthOfNumber;
  const i = op.value;
  if (op.type === "immediate") {
    return l(i);
  } else if (op.type === "register") {
    return l(i) + l(c(i));
  } else if (op.type === "indirect") {
    return l(i) + l(c(i)) + l(c(c(i)));
  } else {
    assertNever(op.type);
  }
}

export function instructionComplexity(instruction: Instruction, c: (i: bigint) => bigint, peekInputValue: () => bigint) {
  const l = lengthOfNumber;
  const t = (op: ReadableOperand) => {
    return operandComplexity(op, c);
  };

  if (instruction.operation === "LOAD") {
    return t(instruction.operand);
  } else if (instruction.operation === "STORE") {
    const op = instruction.operand;
    if (op.type === "register") {
      return l(c(0n)) + l(op.value);
    } else if (op.type === "indirect") {
      return l(c(0n)) + l(op.value) + l(c(op.value));
    } else {
      assertNever(op.type);
    }
  } else if (instruction.operation === "ADD") {
    return l(c(0n)) + t(instruction.operand);
  } else if (instruction.operation === "SUB") {
    return l(c(0n)) + t(instruction.operand);
  } else if (instruction.operation === "MUL") {
    return l(c(0n)) + t(instruction.operand);
  } else if (instruction.operation === "DIV") {
    return l(c(0n)) + t(instruction.operand);
  } else if (instruction.operation == "READ") {
    const op = instruction.operand;
    if (op.type === "register") {
      return l(peekInputValue()) + l(op.value);
    } else if (op.type === "indirect") {
      return l(peekInputValue()) + l(op.value) + l(c(op.value));
    } else {
      assertNever(op.type);
    }
  } else if (instruction.operation === "WRITE") {
    return t(instruction.operand);
  } else if (instruction.operation === "JUMP") {
    return 1n;
  } else if (instruction.operation === "JGTZ") {
    return l(c(0n));
  } else if (instruction.operation === "JZERO") {
    return l(c(0n));
  } else if (instruction.operation === "HALT") {
    return 1n;
  } else {
    assertNever(instruction.operation);
  }
}

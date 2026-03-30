import { assertNever } from "./Util";

export const READABLE_OPERAND_INSTRUCTIONS = ["LOAD", "ADD", "SUB", "MUL", "DIV", "WRITE"] as const;
export const WRITEABLE_OPERAND_INSTRUCTIONS = ["STORE", "READ"] as const;
export const JUMP_INSTRUCTIONS = ["JUMP", "JGTZ", "JZERO"] as const;
export const NO_OPERAND_INSTRUCTIONS = ["HALT"] as const;
export const ALL_INSTRUCTIONS = [
  "LOAD",
  "STORE",
  "ADD",
  "SUB",
  "MUL",
  "DIV",
  "READ",
  "WRITE",
  "JUMP",
  "JGTZ",
  "JZERO",
  "HALT",
  // ...WRITEABLE_OPERAND_INSTRUCTIONS,
  // ...JUMP_INSTRUCTIONS,
  // ...NO_OPERAND_INSTRUCTIONS,
] as const;

export function isPartOfArray<T extends readonly string[]>(value: string, arr: T): value is (typeof arr)[number] {
  return arr.includes(value as (typeof arr)[number]);
}

export function checkInstructionType<T extends readonly string[]>(
  instruction: Instruction,
  arr: T
): instruction is Instruction & { operation: (typeof arr)[number] } {
  return arr.includes(instruction.operation as (typeof arr)[number]);
}

export type ReadableOperand = { type: "immediate" | "register" | "indirect"; value: bigint };
export type WriteableOperand = { type: "register" | "indirect"; value: bigint };
export type ReadableOperandInstruction = { operation: (typeof READABLE_OPERAND_INSTRUCTIONS)[number]; operand: ReadableOperand };
export type WriteableOperandInstruction = { operation: (typeof WRITEABLE_OPERAND_INSTRUCTIONS)[number]; operand: WriteableOperand };
export type JumpInstruction = { operation: (typeof JUMP_INSTRUCTIONS)[number]; label: string };
export type NoOperandInstruction = { operation: (typeof NO_OPERAND_INSTRUCTIONS)[number] };
export type Instruction = ReadableOperandInstruction | WriteableOperandInstruction | JumpInstruction | NoOperandInstruction;

export function operandToString(operand: ReadableOperand): string {
  if (operand.type === "immediate") {
    return `=${operand.value}`;
  } else if (operand.type === "indirect") {
    return `*${operand.value}`;
  } else if (operand.type === "register") {
    return `${operand.value}`;
  }
  assertNever(operand.type);
}

export function instructionToString(instruction: Instruction): string {
  if (checkInstructionType(instruction, READABLE_OPERAND_INSTRUCTIONS)) {
    const op = operandToString(instruction.operand);
    return `${instruction.operation} ${op}`;
  } else if (checkInstructionType(instruction, WRITEABLE_OPERAND_INSTRUCTIONS)) {
    const op = operandToString(instruction.operand);
    return `${instruction.operation} ${op}`;
  } else if (checkInstructionType(instruction, JUMP_INSTRUCTIONS)) {
    return `${instruction.operation} ${instruction.label}`;
  } else if (checkInstructionType(instruction, NO_OPERAND_INSTRUCTIONS)) {
    return `${instruction.operation}`;
  }
  assertNever(instruction);
  // return `${instruction.operand} - unknown instruction`;
}

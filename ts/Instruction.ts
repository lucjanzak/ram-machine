const READABLE_OPERAND_INSTRUCTIONS = ["LOAD", "ADD", "SUB", "MUL", "DIV", "WRITE"] as const;
const WRITEABLE_OPERAND_INSTRUCTIONS = ["STORE", "READ"] as const;
const JUMP_INSTRUCTIONS = ["JUMP", "JGTZ", "JZERO"] as const;
const NO_OPERAND_INSTRUCTIONS = ["HALT"] as const;

function isPartOfArray<T extends readonly string[]>(value: string, arr: T): value is (typeof arr)[number] {
  return arr.includes(value as (typeof arr)[number]);
}

type ReadableOperand = { type: "immediate" | "register" | "indirect"; value: bigint };
type WriteableOperand = { type: "register" | "indirect"; value: bigint };
type ReadableOperandInstruction = { operation: (typeof READABLE_OPERAND_INSTRUCTIONS)[number]; operand: ReadableOperand };
type WriteableOperandInstruction = { operation: (typeof WRITEABLE_OPERAND_INSTRUCTIONS)[number]; operand: WriteableOperand };
type JumpInstruction = { operation: (typeof JUMP_INSTRUCTIONS)[number]; label: string };
type NoOperandInstruction = { operation: (typeof NO_OPERAND_INSTRUCTIONS)[number] };
type Instruction = ReadableOperandInstruction | WriteableOperandInstruction | JumpInstruction | NoOperandInstruction;

function instructionToString(instruction: Instruction): string {
  // TODO
  return instruction.operation as string;
}

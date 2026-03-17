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

type ParsedLine = {
  labels: string[];
  instruction: Instruction | null;
  comment: string | null;
};

type ProgramCounter = number; // should always be a positive integer from 0(?) or from 1 to programlength
class Program {
  static readonly ParsingExample = Program.fromAssembly(`
    ; comment only
    label_only:
    label: ; with comment

    HALT 
    HALT ; with comment
    label_with: HALT
    label_with: HALT ; comment

    READ 2 
    READ 2 ; with comment
    label_with: READ 2
    label_with: READ 2 ; and comment

    JUMP abc 
    JUMP abc ; with comment
    label_with: JUMP abc
    label_with: JUMP abc ; and comment

    LOAD =123 
    LOAD =123 ; with comment
    label_with: LOAD =123
    label_with: LOAD =123 ; and comment

    mul: ti : ple  :la :bels:
    labels with spaces:
    13: ; numeric label
    JUMP labels with spaces
    JUMP 13
`);
  static readonly ParsingErrorsExample = Program.fromAssembly(`
    a b c

    ; these should not work:
    HALT 1 ; halt with argument
    LOAD abc ; load with label
    STORE abc ; store to label
    LOAD ; load with no operand
    STORE; store with no operand
    STORE =3 ; store to immediate operand

    empty label:: ; this should report an error

    ; this should report an error:
    label_at_the_end:
`);
  static readonly NormalExample = Program.fromAssembly(`
start:
LOAD =0
WRITE 0
JUMP start
`);

  private instructions: Instruction[] = [];
  private labels = new Map<string, ProgramCounter>();

  getInstruction(index: ProgramCounter) {
    return this.instructions[index];
  }
  getLabelLocation(label: string) {
    return this.labels.get(label);
  }

  static fromAssembly(assemblyText: string): Program {
    const lines = assemblyText.split("\n");
    const result = {
      instructions: new BigArray<Instruction>();
    };
    lines.forEach((line, lineIndex) => {
      try {
        console.log(`From line #${lineIndex + 1}: '${line}'`);
        const parsed = Parser.parseAssemblyLine(line);
        console.log("Parsed line: ", parsed);
        result.instructions.push(parsed);
      } catch (e) {
        console.warn(`Error while parsing line #${lineIndex + 1}:`, e);
      }
    });

    // TODO
    return new Program(instructions, labels);
  }

  constructor(instructions: Instruction[], labels: Map<string, bigint>) {
    this.instructions = instructions;
    this.labels = labels;
  }
}

// function parseAssemblyLine(line: string): [string, Instruction] {
//   const regex = /^\s*([\w\d]+\s*:\s*)?JUMP\s+[\w\d]+\s*$/;
// }

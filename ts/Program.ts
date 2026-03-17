
type ReadableOperand = { type: "immediate" | "register" | "indirect", value: bigint };
type WriteableOperand = { type: "register" | "indirect", value: bigint };
type ReadableOperandInstruction = { operation: "LOAD" | "ADD" | "SUB" | "MUL" | "DIV" | "WRITE", operand: ReadableOperand };
type WriteableOperandInstruction = { operation: "STORE" | "READ", operand: WriteableOperand };
type JumpInstruction = { operation: "JUMP" | "JGTZ" | "JZERO", label: string };
type HaltInstruction = { operation: "HALT" };
type Instruction = ReadableOperandInstruction | WriteableOperandInstruction | JumpInstruction | HaltInstruction;

class Program {
  private instructions = new BigArray<Instruction>();
  private labels = new Map<string, bigint>();
  getInstruction(index: bigint) {
    return this.instructions.get(index);
  }
  getLabelLocation(label: string) {
    return this.labels.get(label);
  }
  static fromAssembly(assemblyText: string): Program {
    const lines = assemblyText.split("\n");
    lines.forEach((line, index) => {

    });
    throw new Error("todo")
    // TODO
  }
}
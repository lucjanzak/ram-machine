

// function parseAssemblyLine(line: string): [string, Instruction] {
//   const regex = /^\s*([\w\d]+\s*:\s*)?JUMP\s+[\w\d]+\s*$/;
// }

class Machine {
  private running = false;
  private inputTape = new InputTape();
  private outputTape = new OutputTape();
  private memory = new Memory();
  private program = Program.fromAssembly(`
start:
LOAD =0
WRITE 0
JUMP start
`);
  private instructionPointer: bigint = 0n;
  readFromOperand(operand: ReadableOperand): bigint {
    if (operand.type === "immediate") {
      return operand.value;
    } else if (operand.type === "register") {
      return this.memory.getRegister(operand.value);
    } else if (operand.type === "indirect") {
      const address = this.memory.getRegister(operand.value);
      return this.memory.getRegister(address);
    } else {
      console.error("invalid argument: 'operand' is not a ReadableOperand", operand);
      throw new Error("invalid argument: 'operand' is not a ReadableOperand");
    }
  }
  writeToOperand(operand: WriteableOperand, word: bigint) {
    if (operand.type === "register") {
      return this.memory.setRegister(operand.value, word);
    } else if (operand.type === "indirect") {
      const address = this.memory.getRegister(operand.value);
      return this.memory.setRegister(address, word);
    } else {
      console.error("invalid argument: 'operand' is not a WriteableOperand", operand);
      throw new Error("invalid argument: 'operand' is not a WriteableOperand");
    }
  }
  jumpTo(label: string) {
    const newInstructionPointer = this.program.getLabelLocation(label);
    if (newInstructionPointer === undefined) {
      throw new Error(`undefined label: '${label}'`)
    }
    this.instructionPointer = newInstructionPointer;
  }
  executeInstruction(instruction: Instruction) {
    console.log("executing ", instruction, ` @ line ${this.instructionPointer}`);
    if (instruction.operation === "LOAD") {
      const value = this.readFromOperand(instruction.operand);
      this.memory.setAccumulator(value);
      this.instructionPointer++;

    } else if (instruction.operation === "STORE") {
      const value = this.memory.getAccumulator();
      this.writeToOperand(instruction.operand, value);
      this.instructionPointer++;

    } else if (instruction.operation === "ADD") {
      const value = this.readFromOperand(instruction.operand);
      this.memory.setAccumulator(this.memory.getAccumulator() + value);
      this.instructionPointer++;

    } else if (instruction.operation === "SUB") {
      const value = this.readFromOperand(instruction.operand);
      this.memory.setAccumulator(this.memory.getAccumulator() - value);
      this.instructionPointer++;

    } else if (instruction.operation === "MUL") {
      const value = this.readFromOperand(instruction.operand);
      this.memory.setAccumulator(this.memory.getAccumulator() * value);
      this.instructionPointer++;

    } else if (instruction.operation === "DIV") {
      const value = this.readFromOperand(instruction.operand);
      this.memory.setAccumulator(this.memory.getAccumulator() / value);
      this.instructionPointer++;

    } else if (instruction.operation === "READ") {
      const value = this.inputTape.readOrDefault();
      this.writeToOperand(instruction.operand, value);
      this.instructionPointer++;

    } else if (instruction.operation === "WRITE") {
      const value = this.readFromOperand(instruction.operand);
      this.outputTape.write(value);
      this.instructionPointer++;

    } else if (instruction.operation === "JUMP") {
      this.jumpTo(instruction.label);

    } else if (instruction.operation === "JGTZ") {
      const value = this.memory.getAccumulator();
      if (value > 0n) {
        this.jumpTo(instruction.label);
      } else {
        this.instructionPointer++;
      }

    } else if (instruction.operation === "JZERO") {
      const value = this.memory.getAccumulator();
      if (value === 0n) {
        this.jumpTo(instruction.label);
      } else {
        this.instructionPointer++;
      }

    } else if (instruction.operation === "HALT") {
      console.log("program finished");
      this.running = false;
    }
  }
  executeCurrentInstruction() {
    const instruction = this.program.getInstruction(this.instructionPointer);
    if (instruction === undefined) {
      throw new Error("instruction pointer outside of program bounds")
    } else {
      this.executeInstruction(instruction);
    }
  }
  run() {
    this.running = true;
    while (this.running) {
      this.executeCurrentInstruction();
    }
  }
}
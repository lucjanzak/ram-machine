import { updateDOM } from "./app.js";
import { ALL_INSTRUCTIONS, Instruction, ReadableOperand, WriteableOperand } from "./Instruction.js";
import { Memory } from "./Memory.js";
import { Nodes, useTemplate } from "./Nodes.js";
import { Program, ProgramCounter } from "./Program.js";
import { Statistics } from "./Statistics.js";
import { InputTape, OutputTape } from "./Tape.js";
import { assertNever, unwrap } from "./Util.js";

export class Machine {
  private running = false;
  private inputTape = new InputTape();
  private outputTape = new OutputTape();
  private memory = new Memory();
  private programCounter: ProgramCounter = 0;
  public stats = new Statistics();

  constructor(private _program: Program = Program.EMPTY) {}

  get program() {
    return this._program;
  }

  reset() {
    this.running = false;
    this.inputTape.reset();
    this.outputTape.clearAndReset();
    this.memory.clear();
    this.programCounter = 0;
  }

  loadProgramAndReset(program: Program) {
    this._program = program;
    this.reset();
    updateDOM();
  }

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
    const newProgramCounter = this._program.getLabelLocation(label);
    if (newProgramCounter === undefined) {
      throw new Error(`undefined label: '${label}'`);
    }
    this.programCounter = newProgramCounter;
  }
  executeInstruction(instruction: Instruction) {
    console.log("executing ", instruction, ` @ line ${this.programCounter}`);
    this.stats.incrementAndUpdateDOM(instruction.operation);
    if (instruction.operation === "LOAD") {
      const value = this.readFromOperand(instruction.operand);
      this.memory.setAccumulator(value);
      this.programCounter++;
    } else if (instruction.operation === "STORE") {
      const value = this.memory.getAccumulator();
      this.writeToOperand(instruction.operand, value);
      this.programCounter++;
    } else if (instruction.operation === "ADD") {
      const value = this.readFromOperand(instruction.operand);
      this.memory.setAccumulator(this.memory.getAccumulator() + value);
      this.programCounter++;
    } else if (instruction.operation === "SUB") {
      const value = this.readFromOperand(instruction.operand);
      this.memory.setAccumulator(this.memory.getAccumulator() - value);
      this.programCounter++;
    } else if (instruction.operation === "MUL") {
      const value = this.readFromOperand(instruction.operand);
      this.memory.setAccumulator(this.memory.getAccumulator() * value);
      this.programCounter++;
    } else if (instruction.operation === "DIV") {
      const value = this.readFromOperand(instruction.operand);
      this.memory.setAccumulator(this.memory.getAccumulator() / value);
      this.programCounter++;
    } else if (instruction.operation === "READ") {
      const value = this.inputTape.readOrDefault();
      this.writeToOperand(instruction.operand, value);
      this.programCounter++;
    } else if (instruction.operation === "WRITE") {
      const value = this.readFromOperand(instruction.operand);
      this.outputTape.write(value);
      this.programCounter++;
    } else if (instruction.operation === "JUMP") {
      this.jumpTo(instruction.label);
    } else if (instruction.operation === "JGTZ") {
      const value = this.memory.getAccumulator();
      if (value > 0n) {
        this.jumpTo(instruction.label);
      } else {
        this.programCounter++;
      }
    } else if (instruction.operation === "JZERO") {
      const value = this.memory.getAccumulator();
      if (value === 0n) {
        this.jumpTo(instruction.label);
      } else {
        this.programCounter++;
      }
    } else if (instruction.operation === "HALT") {
      console.log("program finished");
      this.running = false;
    } else {
      assertNever(instruction.operation);
    }
  }

  executeCurrentInstruction() {
    const instruction = this._program.getInstruction(this.programCounter);
    if (instruction === undefined) {
      throw new Error("program counter outside of program bounds"); // TODO
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

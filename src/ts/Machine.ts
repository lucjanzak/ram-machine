import { InputTape, InputTapeArray } from "./InputTape";
import { Instruction, ReadableOperand, WriteableOperand } from "./Instruction";
import { Memory } from "./Memory";
import { Nodes } from "./Nodes";
import { OutputTape, OutputTapeArray } from "./OutputTape";
import { Program, ProgramCounter } from "./Program";
import { Statistics } from "./Statistics";
import { assertNever } from "./Util";

export class Machine {
  private running = false;
  private inputTape: InputTape = new InputTapeArray();
  private outputTape: OutputTape = new OutputTapeArray();
  public memory = new Memory(Nodes.registerScrollList);
  private programCounter: ProgramCounter = 0;
  public stats = new Statistics();
  private debugBreakpoints: ProgramCounter[] = []; //[5, 10, 15, 30]; // TODO

  constructor(private program: Program = Program.EMPTY) {}

  getProgram() {
    return this.program;
  }

  reset() {
    this.running = false;
    this.inputTape.reset();
    this.outputTape.clearAndReset();
    this.memory.clear();
    this.programCounter = 0;
    this.stats.clear();
    this.stats.replaceStatisticsDOM();
  }

  loadAssemblyAndReset(assembly: string) {
    window.RAMMachine.editor.setValue(assembly);
    const program = Program.fromAssembly(assembly);
    this.loadProgramAndReset(program);
  }

  loadProgramAndReset(program: Program) {
    this.program = program;
    this.reset();
    this.program.refreshListingWithAnimation();
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
  writeToOperand(operand: WriteableOperand, word: bigint, quiet: boolean) {
    if (operand.type === "register") {
      return this.memory.setRegister(operand.value, word, quiet);
    } else if (operand.type === "indirect") {
      const address = this.memory.getRegister(operand.value);
      return this.memory.setRegister(address, word, quiet);
    } else {
      console.error("invalid argument: 'operand' is not a WriteableOperand", operand);
      throw new Error("invalid argument: 'operand' is not a WriteableOperand");
    }
  }
  jumpTo(label: string) {
    const newProgramCounter = this.program.getLabelLocation(label);
    if (newProgramCounter === undefined) {
      throw new Error(`undefined label: '${label}'`);
    }
    this.programCounter = newProgramCounter;
  }
  executeInstruction(instruction: Instruction, quiet: boolean) {
    // console.log("executing ", instruction, ` @ line ${this.programCounter}`);
    if (quiet) {
      this.stats.processSilently(
        instruction,
        (i) => this.memory.getRegister(i),
        () => this.inputTape.peek() || 0n
      );
    } else {
      this.stats.processAndUpdateDOM(
        instruction,
        (i) => this.memory.getRegister(i),
        () => this.inputTape.peek() || 0n
      );
    }

    if (instruction.operation === "LOAD") {
      const value = this.readFromOperand(instruction.operand);
      this.memory.setAccumulator(value, quiet);
      this.programCounter++;
    } else if (instruction.operation === "STORE") {
      const value = this.memory.getAccumulator();
      this.writeToOperand(instruction.operand, value, quiet);
      this.programCounter++;
    } else if (instruction.operation === "ADD") {
      const value = this.readFromOperand(instruction.operand);
      this.memory.setAccumulator(this.memory.getAccumulator() + value, quiet);
      this.programCounter++;
    } else if (instruction.operation === "SUB") {
      const value = this.readFromOperand(instruction.operand);
      this.memory.setAccumulator(this.memory.getAccumulator() - value, quiet);
      this.programCounter++;
    } else if (instruction.operation === "MUL") {
      const value = this.readFromOperand(instruction.operand);
      this.memory.setAccumulator(this.memory.getAccumulator() * value, quiet);
      this.programCounter++;
    } else if (instruction.operation === "DIV") {
      const value = this.readFromOperand(instruction.operand);
      this.memory.setAccumulator(this.memory.getAccumulator() / value, quiet);
      this.programCounter++;
    } else if (instruction.operation === "READ") {
      const value = this.inputTape.readOrDefault();
      this.writeToOperand(instruction.operand, value, quiet);
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

  executeCurrentInstruction(silent: boolean) {
    const instruction = this.program.getInstruction(this.programCounter);
    if (instruction === undefined) {
      throw new Error("program counter outside of program bounds"); // TODO
    } else {
      this.executeInstruction(instruction, silent);
    }
  }

  runAsFastAsPossible(debug: boolean) {
    this.running = true;

    const timeStarted = Date.now();
    let stage: "normal" | "warning" | "alert" = "normal";

    const stopTime = (currentTime: DOMHighResTimeStamp) => {
      console.log(this.stats);
      this.stats.timeEnd(currentTime);
      this.stats.replaceStatisticsDOM();
    };

    const cancelRunning = (currentTime: DOMHighResTimeStamp) => {
      this.running = false;
      stopTime(currentTime);
      this.memory.sendUpdatesToAllQuietlyUpdatedRegisterRows();
    };

    this.stats.clear();
    this.stats.timeStart();
    while (this.running) {
      if (debug && this.debugBreakpoints.includes(this.programCounter)) {
        alert("breakpoint hit! @ line " + this.programCounter);
      }

      this.executeCurrentInstruction(true);

      const currentTime = Date.now();
      if (stage === "normal" && currentTime - timeStarted > 1000) {
        stage = "warning";
        console.warn("WARNING: Program running longer than 1000ms...");
      } else if (stage === "warning" && currentTime - timeStarted > 3000) {
        stage = "alert";
        const currentTimePrecise = performance.now();
        const answer = confirm("This is taking a while, do you want to cancel?");
        if (answer) {
          // Machine run canceled by user.
          cancelRunning(currentTimePrecise);
          return;
        } else {
          // TODO: idk let the user run it for a while...
        }
      }
    }

    // Normal stop - found a HALT instruction or errored out.
    stopTime(performance.now());
    this.memory.sendUpdatesToAllQuietlyUpdatedRegisterRows();
  }
}

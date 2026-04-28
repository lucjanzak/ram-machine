import { InputTape, InputTapeArray, InputTapeUnderflowBehavior } from "./InputTape";
import { Instruction, ReadableOperand, WriteableOperand } from "./Instruction";
import { t } from "./Localization";
import { Memory, ReadUninitializedRegisterBehavior as UninitializedRegisterReadBehavior } from "./Memory";
import { Nodes } from "./Nodes";
import { OutputTape, OutputTapeArray } from "./OutputTape";
import { Program, ProgramCounter } from "./Program";
import { Statistics } from "./Statistics";
import { assertNever } from "./Util";

type MachineConfig = {
  inputTapeUnderflow: InputTapeUnderflowBehavior;
  uninitializedRegisterRead: UninitializedRegisterReadBehavior;
  programCounterOutOfBounds: "error" | "actAsHalt";
};

export class Machine {
  private running = false;
  private cancelled = false;
  private killed = false;
  public inputTape: InputTape;
  public outputTape: OutputTape;
  public memory: Memory;
  private programCounter: ProgramCounter = 0;
  public stats = new Statistics();
  private debugBreakpoints: ProgramCounter[] = []; //[5, 10, 15, 30]; // TODO

  constructor(
    private program: Program = Program.EMPTY,
    private detachedMode = false,
    private config: MachineConfig = { inputTapeUnderflow: "random", uninitializedRegisterRead: "zero", programCounterOutOfBounds: "error" }
  ) {
    this.memory = new Memory(this.detachedMode ? null : Nodes.registerScrollList);
    this.inputTape = new InputTapeArray(this.detachedMode ? null : Nodes.inputTape, this.detachedMode ? null : Nodes.inputTapeLength);
    this.outputTape = new OutputTapeArray(this.detachedMode ? null : Nodes.outputTape, this.detachedMode ? null : Nodes.outputTapeLength);
  }

  getProgram() {
    return this.program;
  }

  wasKilled() {
    return this.killed;
  }

  reset() {
    this.running = false;
    this.cancelled = false;
    this.killed = false;
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

  loadTapeFromText(text: string) {
    this.inputTape = InputTapeArray.fromText(text, this.detachedMode ? null : Nodes.inputTape, this.detachedMode ? null : Nodes.inputTapeLength);
  }

  getRegister(index: bigint, quiet: boolean): bigint {
    return this.memory.getRegister(index, this.config.uninitializedRegisterRead, quiet);
  }

  getAccumulator(quiet: boolean): bigint {
    return this.memory.getAccumulator(this.config.uninitializedRegisterRead, quiet);
  }

  readInputTape(): bigint {
    return this.inputTape.readOrDefault(this.config.inputTapeUnderflow);
  }

  setRegister(index: bigint, value: bigint, quiet: boolean) {
    this.stats.trackMemory(index, value);
    this.memory.setRegister(index, value, quiet);
  }

  setAccumulator(value: bigint, quiet: boolean) {
    this.stats.trackMemory(0n, value);
    this.memory.setAccumulator(value, quiet);
  }

  readFromOperand(operand: ReadableOperand, quiet: boolean): bigint {
    if (operand.type === "immediate") {
      return operand.value;
    } else if (operand.type === "register") {
      return this.getRegister(operand.value, quiet);
    } else if (operand.type === "indirect") {
      const address = this.getRegister(operand.value, quiet);
      return this.getRegister(address, quiet);
    } else {
      console.error("invalid argument: 'operand' is not a ReadableOperand", operand);
      throw new Error("invalid argument: 'operand' is not a ReadableOperand");
    }
  }
  writeToOperand(operand: WriteableOperand, word: bigint, quiet: boolean) {
    if (operand.type === "register") {
      return this.setRegister(operand.value, word, quiet);
    } else if (operand.type === "indirect") {
      const address = this.getRegister(operand.value, quiet);
      return this.setRegister(address, word, quiet);
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

  // 'quiet' -- suppresses any DOM updates that may be caused by that instruction
  // getRegister instructions can also cause DOM updates
  executeInstruction(instruction: Instruction, quiet: boolean) {
    // console.log("executing ", instruction, ` @ line ${this.programCounter}`);
    if (quiet) {
      this.stats.processSilently(
        instruction,
        (i) => this.getRegister(i, quiet),
        () => this.inputTape.peek() || 0n
      );
    } else {
      this.stats.processAndUpdateDOM(
        instruction,
        (i) => this.getRegister(i, quiet),
        () => this.inputTape.peek() || 0n
      );
    }

    if (instruction.operation === "LOAD") {
      const value = this.readFromOperand(instruction.operand, quiet);
      this.setAccumulator(value, quiet);
      this.programCounter++;
    } else if (instruction.operation === "STORE") {
      const value = this.getAccumulator(quiet);
      this.writeToOperand(instruction.operand, value, quiet);
      this.programCounter++;
    } else if (instruction.operation === "ADD") {
      const value = this.readFromOperand(instruction.operand, quiet);
      this.setAccumulator(this.getAccumulator(quiet) + value, quiet);
      this.programCounter++;
    } else if (instruction.operation === "SUB") {
      const value = this.readFromOperand(instruction.operand, quiet);
      this.setAccumulator(this.getAccumulator(quiet) - value, quiet);
      this.programCounter++;
    } else if (instruction.operation === "MUL") {
      const value = this.readFromOperand(instruction.operand, quiet);
      this.setAccumulator(this.getAccumulator(quiet) * value, quiet);
      this.programCounter++;
    } else if (instruction.operation === "DIV") {
      const value = this.readFromOperand(instruction.operand, quiet);
      this.setAccumulator(this.getAccumulator(quiet) / value, quiet);
      this.programCounter++;
    } else if (instruction.operation === "READ") {
      const value = this.readInputTape();
      this.writeToOperand(instruction.operand, value, quiet);
      this.programCounter++;
    } else if (instruction.operation === "WRITE") {
      const value = this.readFromOperand(instruction.operand, quiet);
      this.outputTape.write(value, quiet);
      this.programCounter++;
    } else if (instruction.operation === "JUMP") {
      this.jumpTo(instruction.label);
    } else if (instruction.operation === "JGTZ") {
      const value = this.getAccumulator(quiet);
      if (value > 0n) {
        this.jumpTo(instruction.label);
      } else {
        this.programCounter++;
      }
    } else if (instruction.operation === "JZERO") {
      const value = this.getAccumulator(quiet);
      if (value === 0n) {
        this.jumpTo(instruction.label);
      } else {
        this.programCounter++;
      }
    } else if (instruction.operation === "HALT") {
      console.log("Program finished");
      this.running = false;
    } else {
      assertNever(instruction.operation);
    }
  }

  executeCurrentInstruction(quiet: boolean) {
    const instruction = this.program.getInstruction(this.programCounter);
    if (instruction === undefined) {
      if (this.config.programCounterOutOfBounds === "error") {
        throw new Error("program counter outside of program bounds"); // TODO
      } else if (this.config.programCounterOutOfBounds === "actAsHalt") {
        this.executeInstruction({ operation: "HALT" }, quiet);
      } else {
        assertNever(this.config.programCounterOutOfBounds);
      }
    } else {
      this.executeInstruction(instruction, quiet);
    }
  }

  // Run All - run all instructions as fast as possible
  runAll(
    debug: boolean,
    options: { timeoutWarning?: number; timeoutAlert?: number; timeoutKill: number } = { timeoutWarning: 1000, timeoutAlert: 3000, timeoutKill: 20000 }
  ) {
    this.running = true;

    const timeStarted = Date.now();
    let timeoutWarned = false;
    let timeoutAlerted = false;

    const stopTime = (currentTime: DOMHighResTimeStamp) => {
      // console.log(this.stats);
      this.stats.timeEnd(currentTime);
      this.stats.replaceStatisticsDOM();
    };

    const cancelRunning = (currentTime: DOMHighResTimeStamp) => {
      this.running = false;
      this.cancelled = true;
      stopTime(currentTime);
      this.memory.refreshAllQuietlyUpdatedRegisters();
      this.outputTape.refreshAllQuietlyUpdatedCells();
    };

    this.stats.clear();
    this.stats.timeStart();
    while (this.running) {
      if (debug && this.debugBreakpoints.includes(this.programCounter)) {
        alert("breakpoint hit! @ line " + this.programCounter);
      }

      this.executeCurrentInstruction(true);

      const currentTime = Date.now();
      const timePassed = currentTime - timeStarted;
      if (options.timeoutWarning && timePassed > options.timeoutWarning && !timeoutWarned) {
        timeoutWarned = true;
        console.warn(`Program running longer than ${options.timeoutWarning}ms...`);
      }
      if (options.timeoutAlert && timePassed > options.timeoutAlert && !timeoutAlerted) {
        timeoutAlerted = true;
        const currentTimePrecise = performance.now();
        const answer = confirm(t.general.executionTimeoutAlert);
        if (answer) {
          // Machine run canceled by user.
          cancelRunning(currentTimePrecise);
          return;
        }
      }
      if (options.timeoutKill && timePassed > options.timeoutKill) {
        const currentTimePrecise = performance.now();
        console.error(`Could not run the program in under ${options.timeoutKill}ms, terminating`);
        this.killed = true;
        cancelRunning(currentTimePrecise);
      }
    }

    // Normal stop - found a HALT instruction or errored out.
    stopTime(performance.now());
    this.memory.refreshAllQuietlyUpdatedRegisters();
    this.outputTape.refreshAllQuietlyUpdatedCells();
  }

  static runSimulation(program: Program, input: bigint[], options: { timeout: number } = { timeout: 100 }): Machine {
    const machine = new Machine(program, true);
    machine.inputTape = InputTapeArray.fromValues(input, null, null);
    machine.runAll(false, { timeoutWarning: undefined, timeoutAlert: undefined, timeoutKill: options.timeout });
    return machine;
  }
}

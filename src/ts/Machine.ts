import { InputTape, InputTapeArray } from "./InputTape";
import { Instruction, ReadableOperand, WriteableOperand } from "./Instruction";
import { t } from "./Localization";
import { Memory } from "./Memory";
import { Nodes } from "./Nodes";
import { OutputTape, OutputTapeArray } from "./OutputTape";
import { Program, ProgramCounter } from "./Program";
import { MachineSettings } from "./Settings";
import { Statistics } from "./Statistics";
import { assertNever } from "./Util";


export type StopReason = "halt" | "error" | "kill" | "timeout";

export class Machine {
  private running = false; // Indicates that the machine is currently in the runAll loop
  private paused = false; // Indicates that the machine is paused inbetween steps
  private stopReason: StopReason | null = null;
  public inputTape: InputTape;
  public outputTape: OutputTape;
  public memory: Memory;
  private programCounter: ProgramCounter = 0;
  public stats = new Statistics();
  private debugBreakpoints: ProgramCounter[] = []; //[5, 10, 15, 30]; // TODO

  constructor(
    private program: Program = Program.EMPTY,
    private detachedMode = false,
    public settings: MachineSettings = new MachineSettings()
  ) {
    this.memory = new Memory(this.detachedMode ? null : Nodes.registerScrollList);
    this.inputTape = new InputTapeArray(this.detachedMode ? null : Nodes.inputTape, this.detachedMode ? null : Nodes.inputTapeLength);
    this.outputTape = new OutputTapeArray(this.detachedMode ? null : Nodes.outputTape, this.detachedMode ? null : Nodes.outputTapeLength);
  }

  getProgram() {
    return this.program;
  }

  wasKilled() {
    return this.stopReason === "kill" || this.stopReason === "timeout";
  }

  isFinished() {
    return this.stopReason !== null;
  }

  getStopReason() {
    return this.stopReason;
  }

  reset() {
    this.running = false;
    this.paused = false;
    this.stopReason = null;
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
    this.inputTape = InputTapeArray.fromString(text, this.detachedMode ? null : Nodes.inputTape, this.detachedMode ? null : Nodes.inputTapeLength);
  }

  getRegister(index: bigint, quiet: boolean): bigint {
    return this.memory.getRegister(index, this.settings.uninitializedRegisterRead, quiet);
  }

  getAccumulator(quiet: boolean): bigint {
    return this.memory.getAccumulator(this.settings.uninitializedRegisterRead, quiet);
  }

  readInputTape(quiet: boolean): bigint {
    return this.inputTape.readOrDefault(quiet, this.settings.inputTapeUnderflow);
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
  // Returns `true` if the machine should stop running
  executeInstruction(instruction: Instruction, quiet: boolean): boolean {
    // console.log("executing ", instruction, ` @ line ${this.programCounter}`);
    if (quiet) {
      this.stats.processSilently(
        instruction,
        (i) => this.getRegister(i, quiet), // TODO: this may return a random value, which may be different from the random value used later in the program
        () => this.inputTape.peek() || 0n // TODO: same for this
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
    } else if (instruction.operation === "MULT") {
      const value = this.readFromOperand(instruction.operand, quiet);
      this.setAccumulator(this.getAccumulator(quiet) * value, quiet);
      this.programCounter++;
    } else if (instruction.operation === "DIV") {
      const value = this.readFromOperand(instruction.operand, quiet);
      this.setAccumulator(this.getAccumulator(quiet) / value, quiet);
      this.programCounter++;
    } else if (instruction.operation === "READ") {
      const value = this.readInputTape(quiet);
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
      return true;
    } else {
      assertNever(instruction.operation);
    }
    return false;
  }

  // Returns `true` if the machine should stop running
  executeCurrentInstruction(quiet: boolean): boolean {
    const instruction = this.program.getInstruction(this.programCounter);
    if (instruction === undefined) {
      if (this.settings.programCounterOutOfBounds === "error") {
        throw new Error("program counter outside of program bounds"); // TODO
      } else if (this.settings.programCounterOutOfBounds === "actAsHalt") {
        return this.executeInstruction({ operation: "HALT" }, quiet);
      } else {
        assertNever(this.settings.programCounterOutOfBounds);
      }
    } else {
      return this.executeInstruction(instruction, quiet);
    }
  }

  updateDOMElements() {
    this.stats.replaceStatisticsDOM();
    this.inputTape.refreshActiveCell();
    this.memory.refreshAllQuietlyUpdatedRegisters();
    this.outputTape.refreshAllQuietlyUpdatedCells();
  }

  private stopMachine(currentTime: DOMHighResTimeStamp, stopReason: StopReason) {
    this.running = false;
    this.stats.timer.stop(currentTime);
    this.stopReason = stopReason;
    this.updateDOMElements();
  }

  // Run All - run all instructions as fast as possible
  runAll(
    debug: boolean,
    options: { timeoutPrintWarning?: number; timeoutUserKill?: number; timeoutAutoKill: number } = { timeoutPrintWarning: 1000, timeoutUserKill: 3000, timeoutAutoKill: 20000 }
  ) {
    if (this.isFinished()) return;

    let timeoutWarned = false;
    let timeoutAlerted = false;

    this.stats.clear();
    this.stats.timer.start();
    this.running = true;

    try {
      while (this.running) {
        const currentTimePrecise = performance.now();
        const timePassed = this.stats.fetchRealTime(currentTimePrecise);

        if (options.timeoutPrintWarning && timePassed > options.timeoutPrintWarning && !timeoutWarned) {
          timeoutWarned = true;
          console.warn(`Program running longer than ${options.timeoutPrintWarning}ms...`);
        }
        
        if (options.timeoutUserKill && timePassed > options.timeoutUserKill && !timeoutAlerted) {
          timeoutAlerted = true;

          this.stats.timer.pause(currentTimePrecise);
          const answer = confirm(t.general.executionTimeoutAlert);
          const currentTimePreciseNew = performance.now();
          this.stats.timer.resume(currentTimePreciseNew);

          if (answer) {
            // Machine killed by user
            this.stopMachine(currentTimePreciseNew, "kill");
            return;
          }
        }

        if (options.timeoutAutoKill && timePassed > options.timeoutAutoKill) {
          // Machine killed by timer
          console.error(`Could not run the program in under ${options.timeoutAutoKill}ms, terminating`);
          this.stopMachine(currentTimePrecise, "timeout");
        }

        // TODO
        if (debug && this.debugBreakpoints.includes(this.programCounter)) {
          alert("breakpoint hit! @ line " + this.programCounter);
        }

        const shouldStop = this.executeCurrentInstruction(true);
        if (shouldStop) {
          // Normal stop - found a HALT instruction
          this.stopMachine(performance.now(), "halt");
        }
      }
    } catch (e) {
      console.error("machine exec error:", e);
      // Exception encountered - error stop
      this.stopMachine(performance.now(), "error");
    }
  }

  // Step - run one instruction
  step() {
    if (this.isFinished()) return;

    this.stats.timer.resume();
    this.paused = false;

    try {
      const shouldStop = this.executeCurrentInstruction(false);
      if (shouldStop) {
        // Normal stop - found a HALT instruction
        this.stopMachine(performance.now(), "halt");
      }
    } catch (e) {
      console.error("machine exec error:", e);
      // Exception encountered - error stop
      this.stopMachine(performance.now(), "error");
    }

    this.stats.timer.pause();
    this.paused = true;
  }

  static runSimulation(program: Program, input: bigint[], options: { timeout: number } = { timeout: 100 }): Machine {
    const machine = new Machine(program, true);
    machine.inputTape = InputTapeArray.fromValues(input, null, null);
    machine.runAll(false, { timeoutPrintWarning: undefined, timeoutUserKill: undefined, timeoutAutoKill: options.timeout });
    return machine;
  }
}

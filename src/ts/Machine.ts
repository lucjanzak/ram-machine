import { InputTape, InputTapeArray, InputTapeArrayDOM } from "./InputTape";
import { Instruction, ReadableOperand, WriteableOperand } from "./Instruction";
import { t } from "./Localization";
import { Memory } from "./Memory";
import { Nodes } from "./Nodes";
import { OutputTape, OutputTapeArray, OutputTapeArrayDOM } from "./OutputTape";
import { CompilerMessage, PreprocessorState } from "./Compiler";
import { Program, ProgramCounter } from "./Program";
import { MachineSettings, preferences, updateSettingsDOM } from "./Settings";
import { Statistics } from "./Statistics";
import { assertNever } from "./Util";
import { BASE64_RATIO, encodeURLHashData } from "./URLCode";
import { clearDecorations, updateCompileProblems } from "./MonacoEditor";

export type StopReason = "halt" | "error" | "kill" | "timeout";

export class Machine {
  private running = false; // Indicates that the machine is currently in the runAll loop
  private paused = false; // Indicates that the machine is paused inbetween steps
  private started = false; // Indicates that the machine is started in debug mode
  private stopReason: StopReason | null = null;
  public inputTape: InputTape;
  public outputTape: OutputTape;
  public memory: Memory;
  private programCounter: ProgramCounter = 0;
  public stats: Statistics;
  private debugBreakpoints: Set<ProgramCounter> = new Set();

  constructor(
    private program: Program = Program.EMPTY,
    private detachedMode = false,
    public settings: MachineSettings = new MachineSettings()
  ) {
    this.stats = new Statistics(this.detachedMode);
    this.memory = new Memory(this.detachedMode ? null : Nodes.registerScrollList);
    this.inputTape = this.detachedMode
      ? new InputTapeArray()
      : new InputTapeArrayDOM(Nodes.inputTape, Nodes.inputTapeLength);
    this.outputTape = this.detachedMode
      ? new OutputTapeArray()
      : new OutputTapeArrayDOM(Nodes.outputTape, Nodes.outputTapeLength);
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

  getMachineStateString() {
    const s = t.status.status.machineStates;
    if (this.stopReason === null) {
      if (this.paused) {
        return s.paused;
      }
      if (this.running) {
        return s.running;
      }
      if (!this.started) {
        return s.reset;
      }
      return s.unknown;
    } else if (this.stopReason === "halt") {
      return s.finished;
    } else if (this.stopReason === "error") {
      return s.error;
    } else if (this.stopReason === "kill") {
      return s.kill;
    } else if (this.stopReason === "timeout") {
      return s.timeout;
    } else {
      assertNever(this.stopReason);
    }
  }

  updateMachineStateDOM() {
    if (this.detachedMode) return;
    Nodes.statusMachineState.textContent = this.getMachineStateString();
  }

  updateProgramCounterDOM() {
    if (this.detachedMode) return;
    if (this.started) {
      Nodes.statusProgramCounter.textContent = `${this.programCounter + 1}`;
    } else {
      Nodes.statusProgramCounter.textContent = "0";
    }
  }

  reset() {
    this.running = false;
    this.paused = false;
    this.started = false;
    this.stopReason = null;
    this.inputTape.reset();
    this.outputTape.clearAndReset();
    this.memory.clear();
    this.programCounter = 0;
    this.resetDebugRowHighlight();
    this.stats.clear();
    this.stats.replaceStatisticsTableAndUpdateDOM();
    this.updateMachineStateDOM();
    this.updateProgramCounterDOM();
  }

  loadAssemblyAndReset(
    assemblySourceCode: string,
    updateEditorContents: boolean = true
  ): {
    success: boolean;
    compilerMessages: CompilerMessage[];
    preprocessorState: PreprocessorState;
  } {
    if (!this.detachedMode) {
      if (updateEditorContents) {
        window.RAMMachine.editor.setValue(assemblySourceCode);
      }
      clearDecorations();

      let newEncodedData = encodeURLHashData(assemblySourceCode);
      const forceUncompressed = false;
      if (newEncodedData.ratio > BASE64_RATIO || forceUncompressed) {
        newEncodedData = encodeURLHashData(assemblySourceCode, 0);
      }
      if (window.location.hash !== newEncodedData.hash) {
        window.history.pushState(null, "", document.location.pathname + newEncodedData.hash);
      }
    }
    const { success, program, compilerMessages, preprocessorState: pre } = Program.fromAssembly(assemblySourceCode);
    if (!this.detachedMode) {
      updateCompileProblems(success, compilerMessages);
    }

    // Load settings included within the file in preprocessor directives
    if (pre.inputTapeString !== null) this.loadTapeFromText(pre.inputTapeString);
    if (pre.inputTapeUnderflow !== null) this.settings.inputTapeUnderflow = pre.inputTapeUnderflow;
    if (pre.uninitializedRegisterRead !== null) this.settings.uninitializedRegisterRead = pre.uninitializedRegisterRead;
    if (pre.programCounterOutOfBounds !== null) this.settings.programCounterOutOfBounds = pre.programCounterOutOfBounds;
    if (!this.detachedMode) {
      updateSettingsDOM(this.settings, preferences);
    }

    // Load program
    this.loadProgramAndReset(program);
    this.debugBreakpoints.clear();
    console.log("Program loaded. Compiler messages:", compilerMessages, "Preprocessor data:", pre);
    return { success, compilerMessages, preprocessorState: pre };
  }

  loadProgramAndReset(program: Program) {
    this.program = program;
    if (!this.detachedMode) {
      window.RAMMachine.chart.clearDataAndUpdate();
    }
    this.reset();
    if (!this.detachedMode) {
      this.program.refreshListingWithAnimation();
    }
  }

  loadTapeFromText(text: string) {
    this.inputTape = this.detachedMode
      ? InputTapeArray.fromString(text)
      : InputTapeArrayDOM.fromStringDOM(text, Nodes.inputTape, Nodes.inputTapeLength);
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
      assertNever(operand.type, "invalid argument: 'operand' is not a ReadableOperand");
    }
  }

  writeToOperand(operand: WriteableOperand, word: bigint, quiet: boolean) {
    if (operand.type === "register") {
      return this.setRegister(operand.value, word, quiet);
    } else if (operand.type === "indirect") {
      const address = this.getRegister(operand.value, quiet);
      return this.setRegister(address, word, quiet);
    } else {
      assertNever(operand.type, "invalid argument: 'operand' is not a WriteableOperand");
    }
  }

  jumpTo(label: string) {
    const newProgramCounter = this.program.getLabelLocation(label);
    if (newProgramCounter === undefined) {
      throw new Error(`undefined label: '${label}'`);
    }
    this.programCounter = newProgramCounter;
  }

  resetDebugRowHighlight() {
    if (!this.detachedMode) {
      const oldActiveLine = Nodes.programListingTable.querySelector<HTMLElement>("tr.debug-line-highlight");
      if (oldActiveLine !== null) oldActiveLine.classList.remove("debug-line-highlight");
    }
  }

  setDebugLineHighlight(programCounter: number) {
    if (!this.detachedMode) {
      const oldActiveLine = Nodes.programListingTable.querySelector<HTMLElement>("tr.debug-line-highlight");
      if (oldActiveLine !== null) oldActiveLine.classList.remove("debug-line-highlight");
      const activeLine = Nodes.programListingTable.querySelector<HTMLElement>(
        `tr[data-line-number="${programCounter + 1}"]`
      );
      if (activeLine !== null) {
        activeLine.classList.add("debug-line-highlight");
        activeLine.scrollIntoView({
          behavior: preferences.getAnimationsEnabled() ? "smooth" : "instant",
          block: "nearest",
        });
      }
    }
  }

  setBreakpointStatus(lineIndex: number, breakpointSet: boolean) {
    if (lineIndex !== Math.floor(lineIndex) || lineIndex < 0 || lineIndex >= this.program.length()) {
      return;
    }

    if (breakpointSet) {
      this.debugBreakpoints.add(lineIndex);
    } else {
      this.debugBreakpoints.delete(lineIndex);
    }
  }

  // 'quiet' -- suppresses any DOM updates that may be caused by that instruction
  // getRegister instructions can also cause DOM updates
  // Returns `true` if the machine should stop running
  executeInstruction(instruction: Instruction, quiet: boolean): boolean {
    // console.log("executing ", instruction, ` @ line ${this.programCounter}`);
    if (quiet) {
      this.stats.processSilently(
        instruction,
        (i) => this.getRegister(i, quiet), // TODO(bug): this may return a random value, which may be different from the random value used later in the program
        () => this.inputTape.peek() || 0n // TODO(bug): same for this
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
        throw new Error("program counter outside of program bounds"); // TODO: display runtime error in status pane
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
    this.stats.replaceStatisticsTableAndUpdateDOM();
    this.inputTape.refreshActiveCell();
    this.memory.refreshAllQuietlyUpdatedRegisters();
    this.outputTape.refreshAllQuietlyUpdatedCells();
    this.updateMachineStateDOM();
    this.updateProgramCounterDOM();
  }

  private stopMachine(currentTime: DOMHighResTimeStamp, stopReason: StopReason) {
    this.running = false;
    this.started = false;
    this.paused = false;
    this.stats.timer.stop(currentTime);
    this.stopReason = stopReason;
    this.resetDebugRowHighlight();
    this.updateDOMElements();
  }

  // Run All - run all instructions as fast as possible
  runAll(
    debug: boolean,
    options: { timeoutPrintWarning?: number; timeoutUserKill?: number; timeoutAutoKill: number } = {
      timeoutPrintWarning: 1000,
      timeoutUserKill: 3000,
      timeoutAutoKill: 20000,
    }
  ) {
    if (this.isFinished()) {
      this.reset();
      return;
    }

    let timeoutWarned = false;
    let timeoutAlerted = false;
    const checkIfStuck = (currentTimePrecise: DOMHighResTimeStamp, timePassed: DOMHighResTimeStamp) => {
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
    };

    if (!this.started) {
      // First step should clear the stats as well
      this.stats.clear();
    }
    const wasPausedOnLineIndex = this.paused ? this.programCounter : null;
    let executedInstructionInThisInvocation = false;
    this.stats.timer.resume();
    this.started = true;
    this.running = true;
    this.paused = false;

    try {
      while (this.running) {
        const currentTimePrecise = performance.now();
        const timePassed = this.stats.fetchRealTime(currentTimePrecise);

        checkIfStuck(currentTimePrecise, timePassed);

        if (debug && this.debugBreakpoints.has(this.programCounter)) {
          // We are currently on a line that has a breakpoint, and we have debug mode active.
          // If it was already paused here, we want to continue running the program. But (wasPausedOnLineIndex !== this.programCounter) does not work, because of loops.
          // We need to check if anything was executed yet in this runAll invocation.
          // If some lines have been executed in this runAll invocation, then we should actually pause on this breakpoint.
          // If no lines have been executed in this invocation yet, then we need to execute this line.
          if (executedInstructionInThisInvocation) {
            // alert("breakpoint hit! @ line with index " + this.programCounter);
            this.stats.timer.pause();
            this.paused = true;
            this.setDebugLineHighlight(this.programCounter);
            this.updateDOMElements();
            return;
          }
        }

        const shouldStop = this.executeCurrentInstruction(true);
        executedInstructionInThisInvocation = true;
        if (shouldStop) {
          // Normal stop - found a HALT instruction
          this.stopMachine(performance.now(), "halt");
        }
      }
    } catch (e) {
      console.error("machine exec error:", e);
      // TODO: show these runtime errors in status pane
      // Exception encountered - error stop
      this.stopMachine(performance.now(), "error");
    }
  }

  // Step - run one instruction
  step() {
    if (this.isFinished()) return;

    // First step should not actually execute anything, just highlight the first line
    if (!this.started) {
      this.started = true;
      this.paused = true;
      this.setDebugLineHighlight(this.programCounter);
      this.updateMachineStateDOM();
      this.updateProgramCounterDOM();
      return;
    }

    this.stats.timer.resume();
    this.paused = false;

    try {
      const shouldStop = this.executeCurrentInstruction(false);
      if (shouldStop) {
        // Normal stop - found a HALT instruction
        this.stopMachine(performance.now(), "halt");
        return;
      }
    } catch (e) {
      console.error("machine exec error:", e);
      // TODO: show error in status pane
      // Exception encountered - error stop
      this.stopMachine(performance.now(), "error");
      return;
    }

    this.stats.timer.pause();
    this.paused = true;
    this.setDebugLineHighlight(this.programCounter);
    this.updateMachineStateDOM();
    this.updateProgramCounterDOM();
  }

  static runSimulation(
    program: Program,
    inputTape: InputTape,
    options: { timeout: number } = { timeout: 100 },
    settings: MachineSettings = MachineSettings.simulationDefaults()
  ): Machine {
    const machine = new Machine(program, true, settings);
    machine.inputTape = inputTape;
    machine.runAll(false, {
      timeoutPrintWarning: undefined,
      timeoutUserKill: undefined,
      timeoutAutoKill: options.timeout,
    });
    return machine;
  }
}

import { SparseArray } from "./BigArray";
import { DataPoint } from "./Chart";
import { instructionComplexity, lengthOfNumber } from "./Complexity";
import { ALL_INSTRUCTIONS, Instruction } from "./Instruction";
import { Nodes, select, Templates, useTemplate } from "./Nodes";
import { Timer } from "./Timer";

export class Statistics {
  private timeComplexitySimple: bigint = 0n;
  private timeComplexityLog: bigint = 0n;
  public instructionCounters = Statistics.createEmptyCounters();
  private memoryTracker = new SparseArray<bigint>();
  public timer: Timer = new Timer();

  processSilently(instruction: Instruction, contentsOfRegister: (i: bigint) => bigint, peekInput: () => bigint) {
    this.instructionCounters[instruction.operation] += 1n;
    this.timeComplexitySimple += 1n;
    this.timeComplexityLog += instructionComplexity(instruction, contentsOfRegister, peekInput);
  }

  processAndUpdateDOM(instruction: Instruction, contentsOfRegister: (i: bigint) => bigint, peekInput: () => bigint) {
    this.processSilently(instruction, contentsOfRegister, peekInput);
    // TODO: this can be improved by not replacing the entire statistics table every time
    this.replaceStatisticsDOM();
  }

  trackMemory(index: bigint, writtenValue: bigint) {
    const length = lengthOfNumber(writtenValue);
    const stored = this.memoryTracker.get(index);
    if (stored === undefined || length > stored) {
      this.memoryTracker.set(index, length);
    }
  }

  fetchTimeComplexitySimple() {
    return this.timeComplexitySimple;
  }

  fetchTimeComplexityLog() {
    return this.timeComplexityLog;
  }

  fetchMemoryComplexitySimple() {
    return BigInt(this.memoryTracker.size());
  }

  fetchMemoryComplexityLog() {
    let result = 0n;
    for (const [_index, value] of this.memoryTracker) {
      result += value;
    }
    return result;
  }

  fetchCounter(instruction: (typeof ALL_INSTRUCTIONS)[number]) {
    return this.instructionCounters[instruction];
  }

  asDataPoint(label: bigint): DataPoint {
    return {
      n: Number(label),
      memoryComplexity: Number(this.fetchMemoryComplexitySimple()),
      memoryComplexityLog: Number(this.fetchMemoryComplexityLog()),
      timeComplexity: Number(this.fetchTimeComplexitySimple()),
      timeComplexityLog: Number(this.fetchTimeComplexityLog()),
      realTime: this.fetchRealTime(),
    };
  }

  static createEmptyCounters(): { [key in (typeof ALL_INSTRUCTIONS)[number]]: bigint } {
    const counters: any = {};
    for (const instruction of ALL_INSTRUCTIONS) {
      counters[instruction] = 0n;
    }
    return counters as { [key in (typeof ALL_INSTRUCTIONS)[number]]: bigint };
  }

  clear() {
    this.instructionCounters = Statistics.createEmptyCounters();
    this.memoryTracker.clear();
    this.timeComplexitySimple = 0n;
    this.timeComplexityLog = 0n;
    this.timer = new Timer();
  }

  fetchRealTime(currentTimePrecise: DOMHighResTimeStamp = performance.now()): number {
    return this.timer.time(currentTimePrecise);
  }

  replaceStatisticsDOM() {
    // TODO: make this class detachable from DOM - stats tables are also updated during simulations for charts
    Nodes.stats.textContent = "";

    function generateRow(titleText: string, valueText: string) {
      const f = useTemplate(Templates.statsRow);
      const totalCellTitle = select<HTMLTableCellElement>(f, "#instruction");
      totalCellTitle.textContent = titleText;
      totalCellTitle.style.fontWeight = "700";
      const totalCellCounter = select<HTMLTableCellElement>(f, "#count");
      totalCellCounter.textContent = valueText;
      totalCellCounter.style.fontWeight = "700";
      Nodes.stats.append(f);
    }

    let total = 0n;
    for (const instruction of ALL_INSTRUCTIONS) {
      const counter = this.fetchCounter(instruction);

      const f = useTemplate(Templates.statsRow);
      select(f, "#instruction").textContent = instruction;
      select(f, "#count").textContent = `${counter}`;
      total += counter;
      Nodes.stats.append(f);
    }

    const timeMs = this.fetchRealTime();
    const timeMsBigInt = BigInt(Math.round(timeMs * 1000));
    const speed = timeMsBigInt === 0n ? 0 : (total * 1000000n) / timeMsBigInt;

    generateRow("Total", `${total}`);
    generateRow("Time", `${Math.round(timeMs * 1000) / 1000} ms`);
    generateRow("Avg. Speed", `${speed} inst. / s`);
    generateRow("Mem Cmplx", `${this.fetchMemoryComplexitySimple()}`);
    generateRow("Mem Cmplx (Log)", `${this.fetchMemoryComplexityLog()}`);
    generateRow("Time Cmplx", `${this.fetchTimeComplexitySimple()}`);
    generateRow("Time Cmplx (Log)", `${this.fetchTimeComplexityLog()}`);
  }
}

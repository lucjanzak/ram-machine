import { instructionComplexity } from "./Complexity";
import { ALL_INSTRUCTIONS, Instruction } from "./Instruction";
import { Nodes, select, useTemplate } from "./Nodes";

export class Statistics {
  public instructionCounters = Statistics.createEmptyCounters();
  public startTime: DOMHighResTimeStamp | null = null;
  public endTime: DOMHighResTimeStamp | null = null;
  public timeLogComplexity: bigint = 0n;
  processSilently(instruction: Instruction, c: (i: bigint) => bigint, peekInput: () => bigint) {
    this.instructionCounters[instruction.operation] += 1n;
    this.timeLogComplexity += instructionComplexity(instruction, c, peekInput);
  }
  processAndUpdateDOM(instruction: Instruction, c: (i: bigint) => bigint, peekInput: () => bigint) {
    this.processSilently(instruction, c, peekInput);
    // TODO: this can be improved by not replacing the entire statistics table every time
    this.replaceStatisticsDOM();
  }

  fetchCounter(instruction: (typeof ALL_INSTRUCTIONS)[number]) {
    return this.instructionCounters[instruction];
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
    this.timeLogComplexity = 0n;
    this.startTime = null;
    this.endTime = null;
  }

  timeStart() {
    this.startTime = performance.now();
  }
  timeEnd(currentTime: DOMHighResTimeStamp = performance.now()) {
    this.endTime = currentTime;
  }
  fetchTime(): number {
    // TODO
    return (this.endTime ?? 0) - (this.startTime ?? 0);
  }

  replaceStatisticsDOM() {
    Nodes.stats.textContent = "";
    let total = 0n;

    for (const instruction of ALL_INSTRUCTIONS) {
      const counter = this.fetchCounter(instruction);

      const f = useTemplate(Nodes.statsRow);
      select(f, "#instruction").textContent = instruction;
      select(f, "#count").textContent = `${counter}`;
      total += counter;
      Nodes.stats.append(f);
    }

    {
      const f = useTemplate(Nodes.statsRow);
      const totalCellTitle = select<HTMLTableCellElement>(f, "#instruction");
      totalCellTitle.textContent = "Total";
      totalCellTitle.style.fontWeight = "700";
      const totalCellCounter = select<HTMLTableCellElement>(f, "#count");
      totalCellCounter.textContent = `${total}`;
      totalCellCounter.style.fontWeight = "700";
      Nodes.stats.append(f);
    }

    const timeMs = this.fetchTime();
    {
      const f = useTemplate(Nodes.statsRow);
      const timeCellTitle = select<HTMLTableCellElement>(f, "#instruction");
      timeCellTitle.textContent = "Time";
      timeCellTitle.style.fontWeight = "700";
      const timeCellCounter = select<HTMLTableCellElement>(f, "#count");
      timeCellCounter.textContent = `${timeMs} ms`;
      timeCellCounter.style.fontWeight = "700";
      Nodes.stats.append(f);
    }

    const timeMsBigInt = BigInt(Math.round(timeMs * 1000));
    const speed = timeMsBigInt === 0n ? 0 : (total * 1000000n) / timeMsBigInt;
    const f = useTemplate(Nodes.statsRow);
    const speedCellTitle = select<HTMLTableCellElement>(f, "#instruction");
    speedCellTitle.textContent = "Speed";
    speedCellTitle.style.fontWeight = "700";
    const speedCellCounter = select<HTMLTableCellElement>(f, "#count");
    speedCellCounter.textContent = `${speed} inst. / s`;
    speedCellCounter.style.fontWeight = "700";
    Nodes.stats.append(f);
  }
}

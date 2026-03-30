import { ALL_INSTRUCTIONS } from "./Instruction.js";
import { Nodes, useTemplate } from "./Nodes.js";
import { unwrap } from "./Util.js";

export class Statistics {
  private counters = Statistics.createEmptyCounters();
  private startTime: DOMHighResTimeStamp | null = null;
  private endTime: DOMHighResTimeStamp | null = null;
  incrementSilently(instruction: (typeof ALL_INSTRUCTIONS)[number]) {
    this.counters[instruction] += 1n;
  }
  incrementAndUpdateDOM(instruction: (typeof ALL_INSTRUCTIONS)[number]) {
    this.incrementSilently(instruction);
    // TODO: this can be improved by not replacing the entire statistics table every time
    this.replaceStatisticsDOM();
  }

  fetchCounter(instruction: (typeof ALL_INSTRUCTIONS)[number]) {
    return this.counters[instruction];
  }

  static createEmptyCounters(): { [key in (typeof ALL_INSTRUCTIONS)[number]]: bigint } {
    const counters: any = {};
    for (const instruction of ALL_INSTRUCTIONS) {
      counters[instruction] = 0n;
    }
    return counters as { [key in (typeof ALL_INSTRUCTIONS)[number]]: bigint };
  }

  clear() {
    this.counters = Statistics.createEmptyCounters();
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
      unwrap(f.querySelector("#instruction")).textContent = instruction;
      unwrap(f.querySelector("#count")).textContent = `${counter}`;
      total += counter;
      Nodes.stats.append(f);
    }

    {
      const f = useTemplate(Nodes.statsRow);
      const totalCellTitle = unwrap(f.querySelector<HTMLTableCellElement>("#instruction"));
      totalCellTitle.textContent = "Total";
      totalCellTitle.style.fontWeight = "700";
      const totalCellCounter = unwrap(f.querySelector<HTMLTableCellElement>("#count"));
      totalCellCounter.textContent = `${total}`;
      totalCellCounter.style.fontWeight = "700";
      Nodes.stats.append(f);
    }

    const timeMs = this.fetchTime();
    {
      const f = useTemplate(Nodes.statsRow);
      const timeCellTitle = unwrap(f.querySelector<HTMLTableCellElement>("#instruction"));
      timeCellTitle.textContent = "Time";
      timeCellTitle.style.fontWeight = "700";
      const timeCellCounter = unwrap(f.querySelector<HTMLTableCellElement>("#count"));
      timeCellCounter.textContent = `${timeMs} ms`;
      timeCellCounter.style.fontWeight = "700";
      Nodes.stats.append(f);
    }

    const timeMsBigInt = BigInt(Math.round(timeMs * 1000));
    const speed = timeMsBigInt === 0n ? 0 : (total * 1000000n) / timeMsBigInt;
    const f = useTemplate(Nodes.statsRow);
    const speedCellTitle = unwrap(f.querySelector<HTMLTableCellElement>("#instruction"));
    speedCellTitle.textContent = "Speed";
    speedCellTitle.style.fontWeight = "700";
    const speedCellCounter = unwrap(f.querySelector<HTMLTableCellElement>("#count"));
    speedCellCounter.textContent = `${speed} inst. / s`;
    speedCellCounter.style.fontWeight = "700";
    Nodes.stats.append(f);
  }
}

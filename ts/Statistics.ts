import { ALL_INSTRUCTIONS } from "./Instruction.js";
import { Nodes, useTemplate } from "./Nodes.js";
import { unwrap } from "./Util.js";

export class Statistics {
  private counters = Statistics.createEmptyCounters();
  incrementSilently(instruction: (typeof ALL_INSTRUCTIONS)[number]) {
    this.counters[instruction] += 1n;
  }
  incrementAndUpdateDOM(instruction: (typeof ALL_INSTRUCTIONS)[number]) {
    this.incrementAndUpdateDOM(instruction);
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
  }

  replaceStatisticsDOM() {
    Nodes.stats.textContent = "";
    for (const instruction of ALL_INSTRUCTIONS) {
      const f = useTemplate(Nodes.statsRow);
      unwrap(f.querySelector("#instruction")).textContent = instruction;
      unwrap(f.querySelector("#count")).textContent = `${this.fetchCounter(instruction)}`;
      Nodes.stats.append(f);
    }
  }
}

import { ContiguousArray } from "./BigArray";

export interface OutputTape {
  write(value: bigint): void;
  clearAndReset(): void;
}

export class OutputTapeArray implements OutputTape {
  private values = new ContiguousArray<bigint>();
  private currentIndex: bigint = 0n;
  write(value: bigint) {
    this.values.push(value);
    this.currentIndex++;
  }
  clearAndReset() {
    this.values = new ContiguousArray();
    this.currentIndex = 0n;
  }
}

export class OutputTapeMock implements OutputTape {
  private currentIndex: bigint = 0n;
  write(_value: bigint) {
    this.currentIndex++;
  }
  clearAndReset() {
    this.currentIndex = 0n;
  }
}

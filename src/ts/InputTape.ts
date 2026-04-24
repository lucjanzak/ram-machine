import { ContiguousArray } from "./BigArray";
import { readUnsetRegisterValue } from "./Memory";

export interface InputTape {
  peek(): bigint | undefined;
  read(): bigint | undefined;
  readOrDefault(): bigint;
  reset(): void;
  clearAndReset(): void;
}

export class InputTapeArray implements InputTape {
  private values = new ContiguousArray<bigint>();
  private currentIndex: bigint = 0n;
  peek() {
    return this.values.get(this.currentIndex);
  }
  read() {
    const value = this.values.get(this.currentIndex);
    this.currentIndex++;
    return value;
  }
  readOrDefault() {
    const value = this.read();
    if (value === undefined) {
      return readUnsetRegisterValue();
    } else {
      return value;
    }
  }
  reset() {
    this.currentIndex = 0n;
  }
  clearAndReset() {
    this.values = new ContiguousArray();
    this.currentIndex = 0n;
  }
  static fromValues(values: bigint[], hostElement: HTMLElement | null) {
    const tape = new InputTapeArray(hostElement);
    tape.values.push(...values);
    return tape;
  }
  constructor(public hostElement: HTMLElement | null) {}
}

// export class InputTapeMock implements InputTape {
//   private currentIndex: bigint = 0n;
//   read(): bigint | undefined {
//     // TODO
//     this.currentIndex++;
//     return 1n;
//   }
//   readOrDefault(): bigint {
//     this.currentIndex++;
//     return 1n;
//   }
//   reset(): void {
//     this.currentIndex = 0n;
//   }
//   clearAndReset(): void {
//     this.currentIndex = 0n;
//   }
// }

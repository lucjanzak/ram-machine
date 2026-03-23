import { BigArray, BigIntegerArray } from "./BigArray.js";
import { readUnsetRegisterValue } from "./Memory.js";

export class InputTape {
  private values: BigIntegerArray = new BigArray();
  private currentIndex: bigint = 0n;
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
}

export class OutputTape {
  private values: BigIntegerArray = new BigArray();
  private currentIndex: bigint = 0n;
  write(value: bigint) {
    this.values.set(this.currentIndex, value);
    this.currentIndex++;
  }
  clearAndReset() {
    this.values = new BigArray();
    this.currentIndex = 0n;
  }
}

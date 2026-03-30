import { BigArray, BigIntegerArray } from "./BigArray";

export function readUnsetRegisterValue() {
  // return 0n;
  return BigInt(Math.random() * 100);
}

export class Memory {
  private registers: BigIntegerArray = new BigArray();
  getAccumulator(): bigint {
    return this.getRegister(0n);
  }
  getRegister(index: bigint): bigint {
    const register = this.registers.get(index);
    if (register === undefined) {
      return readUnsetRegisterValue(); // Default value for unset registers
    } else {
      return register;
    }
  }
  setAccumulator(value: bigint) {
    this.setRegister(0n, value);
  }
  setRegister(index: bigint, value: bigint) {
    this.registers.set(index, value);
  }
  clear() {
    this.registers = new BigArray();
  }
}

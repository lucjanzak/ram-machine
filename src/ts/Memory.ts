import { SparseArray } from "./BigArray";

export function readUnsetRegisterValue() {
  // return 0n;
  // TODO: option for this: either 0n, or error out, or random value
  return BigInt(Math.floor(Math.random() * 10000));
}

export class Memory {
  private registers = new SparseArray<bigint>();
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
    this.registers = new SparseArray();
  }
}

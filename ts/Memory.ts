function unsetRegisterValue() {
  // return 0n;
  return BigInt(Math.random() * 100);
}

class Memory {
  private registers: BigIntArray = new BigArray();
  getAccumulator(): bigint {
    return this.getRegister(0n);
  }
  getRegister(index: bigint): bigint {
    const register = this.registers.get(index);
    if (register === undefined) {
      return unsetRegisterValue(); // Default value for unset registers
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
}

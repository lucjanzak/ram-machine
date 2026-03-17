
class InputTape {
  private values: BigIntArray = new BigArray();
  private currentIndex: bigint = 0n;
  read() {
    const value = this.values.get(this.currentIndex);
    this.currentIndex++;
    return value;
  }
  readOrDefault() {
    const value = this.read();
    if (value === undefined) {
      return unsetRegisterValue();
    } else {
      return value;
    }
  }
}

class OutputTape {
  private values: BigIntArray = new BigArray();
  private currentIndex: bigint = 0n;
  write(value: bigint) {
    this.values.set(this.currentIndex, value)
    this.currentIndex++;
  }
}

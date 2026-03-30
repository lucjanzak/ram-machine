// No negative indeces allowed
export class BigArray<ValueType> {
  private values;
  get(index: bigint): ValueType | undefined {
    if (index < 0) throw new Error("array index cannot be negative");
    return this.values.get(index);
  }
  has(index: bigint): boolean {
    if (index < 0) throw new Error("array index cannot be negative");
    return this.values.has(index);
  }
  set(index: bigint, value: ValueType) {
    if (index < 0) throw new Error("array index cannot be negative");
    this.values.set(index, value);
  }
  remove(index: bigint, value: ValueType): boolean {
    if (index < 0) throw new Error("array index cannot be negative");
    return this.values.delete(index);
  }
  constructor() {
    this.values = new Map<bigint, ValueType>();
  }
}
export type BigIntegerArray = BigArray<bigint>;

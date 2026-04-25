// No negative indeces allowed
export class SparseArray<ValueType> {
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
  delete(index: bigint, value: ValueType): boolean {
    if (index < 0) throw new Error("array index cannot be negative");
    return this.values.delete(index);
  }
  clear() {
    this.values.clear();
  }
  size() {
    return this.values.size;
  }
  [Symbol.iterator]() {
    return this.values[Symbol.iterator]();
  }
  constructor() {
    this.values = new Map<bigint, ValueType>();
  }
}

// No negative indeces allowed
export class ContiguousArray<ValueType> {
  private values: Array<ValueType>;
  asArray(): ValueType[] {
    return this.values;
  }
  getUnwrap(index: bigint): ValueType {
    if (index < 0) throw new Error("array index cannot be negative");
    if (index >= this.values.length) throw new Error("array index out of bounds");
    return this.values[Number(index)];
  }
  get(index: bigint): ValueType | undefined {
    if (index < 0) throw new Error("array index cannot be negative");
    if (index >= this.values.length) return undefined;
    return this.values[Number(index)];
  }
  has(index: bigint): boolean {
    if (index < 0) throw new Error("array index cannot be negative");
    return index < this.values.length;
  }
  length(): bigint {
    return BigInt(this.values.length);
  }
  update(index: bigint, value: ValueType) {
    if (index < 0) throw new Error("array index cannot be negative");
    if (index >= this.values.length) throw new Error("array index out of bounds");
    this.values[Number(index)] = value;
  }
  setWithFill(index: bigint, value: ValueType, emptyValueToInsert: ValueType) {
    if (index < 0) throw new Error("array index cannot be negative");
    while (index >= this.values.length) {
      this.push(emptyValueToInsert);
    }
    if (index < this.values.length) {
      this.values[Number(index)] = value;
    } else {
      this.push(value);
    }
  }

  popUnwrap(): ValueType {
    if (this.values.length === 0) throw new Error("array underflow");
    return this.values.pop()!;
  }
  pop(): ValueType | undefined {
    return this.values.pop();
  }
  push(...values: ValueType[]) {
    this.values.push(...values);
  }
  shiftUnwrap(): ValueType {
    if (this.values.length === 0) throw new Error("array underflow");
    return this.values.shift()!;
  }
  shift(): ValueType | undefined {
    return this.values.shift();
  }
  unshift(...values: ValueType[]) {
    this.values.unshift(...values);
  }
  constructor() {
    this.values = [];
  }
}

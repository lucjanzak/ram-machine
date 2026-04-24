// Number with an integer part and a fractional part. Composed of a `bigint` and a `number`.
export class MixedNumber {
  integer: bigint;
  fraction: number; // float in range: [0, 1)

  constructor(integerPart: bigint, fractionalPart: number) {
    if (fractionalPart < 0 || fractionalPart >= 1) {
      throw new TypeError(`fractionalPart has to be in range [0, 1)`);
    }
    this.integer = integerPart;
    this.fraction = fractionalPart;
  }

  static fromBigInt(integer: bigint) {
    return new MixedNumber(integer, 0);
  }
  static fromFloat(float: number) {
    const floor = Math.floor(float);
    const previousInteger = BigInt(floor);
    const fraction = float - floor;
    if (fraction >= 1) {
      // return new MixedNumber(previousInteger + BigInt(fraction), 0);
      throw new Error(`floating point error!!! float=${float} floor=${floor} previousInteger=${previousInteger} fraction=${fraction} >= 1`);
    } else {
      return new MixedNumber(previousInteger, fraction);
    }
  }
  static fromImproper(integer: bigint, float: number) {
    const mixed = this.fromFloat(float);
    mixed.integer += integer;
    return mixed;
  }

  isNegative() {
    return this.integer < 0n;
  }

  isZero() {
    return this.integer === 0n && this.fraction === 0;
  }

  isInteger() {
    return this.fraction === 0;
  }

  floor() {
    return new MixedNumber(this.integer, 0);
  }

  ceil() {
    if (this.isInteger()) {
      return new MixedNumber(this.integer, 0);
    } else {
      return new MixedNumber(this.integer + 1n, 0);
    }
  }

  nextInt() {
    return new MixedNumber(this.integer + 1n, 0);
  }

  prevInt() {
    if (this.isInteger()) {
      return new MixedNumber(this.integer - 1n, 0);
    } else {
      return new MixedNumber(this.integer, 0);
    }
  }

  add(rhs: MixedNumber) {
    return MixedNumber.fromImproper(this.integer + rhs.integer, this.fraction + rhs.fraction);
  }

  sub(rhs: MixedNumber) {
    return MixedNumber.fromImproper(this.integer - rhs.integer, this.fraction - rhs.fraction);
  }

  mulInt(rhs: bigint) {
    return MixedNumber.fromImproper(this.integer * rhs, this.fraction * Number(rhs));
  }

  eq(rhs: MixedNumber): boolean {
    return this.sub(rhs).isZero();
  }

  ne(rhs: MixedNumber): boolean {
    return !this.sub(rhs).isZero();
  }

  lt(rhs: MixedNumber): boolean {
    return this.sub(rhs).isNegative();
  }

  lte(rhs: MixedNumber): boolean {
    const diff = this.sub(rhs);
    return diff.isNegative() || diff.isZero();
  }

  gt(rhs: MixedNumber): boolean {
    const diff = this.sub(rhs);
    return !diff.isNegative() && !diff.isZero();
  }

  gte(rhs: MixedNumber): boolean {
    return !this.sub(rhs).isNegative();
  }

  min(rhs: MixedNumber) {
    if (this.lte(rhs)) {
      return this;
    } else {
      return rhs;
    }
  }

  max(rhs: MixedNumber) {
    if (this.gte(rhs)) {
      return this;
    } else {
      return rhs;
    }
  }

  // Warning: lossy
  value(): number {
    return Number(this.integer) + this.fraction;
  }

  // TODO: better implementation, this can be lossless
  toString(): string {
    return `${this.value()}`;
  }

  static zero() {
    return new MixedNumber(0n, 0);
  }
}

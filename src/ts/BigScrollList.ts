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

  add(rhs: MixedNumber) {
    return MixedNumber.fromImproper(this.integer + rhs.integer, this.fraction + rhs.fraction);
  }

  sub(rhs: MixedNumber) {
    return MixedNumber.fromImproper(this.integer - rhs.integer, this.fraction - rhs.fraction);
  }

  mulInt(rhs: bigint) {
    return MixedNumber.fromImproper(this.integer * rhs, this.fraction * Number(rhs));
  }

  // Warning: lossy
  value(): number {
    return Number(this.integer) + this.fraction;
  }

  static zero() {
    return new MixedNumber(0n, 0);
  }
}

export class BigScrollList {
  currentScrollProgress: MixedNumber = MixedNumber.zero();

  updateContainerElement() {
    // Remove elements out-of-view
    this.containerElement.children[Symbol.iterator]().forEach((element) => {
      const htmlElement = element as HTMLElement;
      const index = htmlElement.dataset.elementIndex;
      if (index === undefined) {
        console.warn("Found element with no index");
        return;
      }

      if (!this.isInView(BigInt(index))) {
        console.log("removing element out of view");
        element.remove();
      }
    });
  }
  getViewBoundStart(): MixedNumber {
    return this.currentScrollProgress;
  }
  getViewBoundSize(): MixedNumber {
    return MixedNumber.fromFloat(this.containerAvailableSize() / this.itemSize());
  }
  getViewBoundEnd(): MixedNumber {
    return this.getViewBoundStart().add(this.getViewBoundSize());
  }
  getTotalListSize(): MixedNumber {
    return MixedNumber.fromFloat(this.itemSize()).mulInt(this.itemCount());
  }
  isInView(index: bigint) {
    const rangeStart = this.getViewBoundStart();
    const rangeEnd = this.getViewBoundEnd();
    return index >= rangeStart.integer && index < rangeEnd.integer + 1n;
  }
  constructor(
    public containerElement: HTMLElement,

    // Get the amount of items stored in the list
    public itemCount: () => bigint,

    // Get the size of each item (each element must have the same length)
    public itemSize: () => number,

    // Get the DocumentFragment for a specific item in the list
    public getDocumentFragmentFromIndex: (index: bigint) => DocumentFragment,

    // Get the available size of the container
    public containerAvailableSize: () => number
  ) {}
}

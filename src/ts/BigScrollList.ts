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

export class BigScrollList {
  // On Chrome, the scrollstop "top" value is automatically bounded to the maximum possible value if it exceeds the limit.
  // The max value for Chrome is 33554432n, which is equal to `2147483648 * (1 / 64)`.
  // On Firefox, the maximum possible scrollstop "top" value is written below, which is equal to `2147483648 * (1 / 120)`:
  // static MAX_POSSIBLE_SCROLL = MixedNumber.fromFloat(2147483648 / 120).floor();
  static MAX_POSSIBLE_SCROLL = new MixedNumber(17895697n, 1 / 15).floor();

  currentScrollProgress: MixedNumber = MixedNumber.zero();
  activeElements: Set<bigint> = new Set();

  updateElements() {
    // Analyze existing elements
    for (const listElement of this.containerElement.children) {
      const htmlElement = listElement as HTMLElement;
      const indexStr = htmlElement.dataset.elementIndex;
      if (indexStr === undefined) {
        // console.warn("Found element with no index property!", listElement);
        continue;
      }

      const index = BigInt(indexStr);
      if (this.isInView(index)) {
        // htmlElement.style.backgroundColor = "#00ff001f";
        this.activeElements.add(index);
      } else {
        // console.log(`remove: ${index}`);
        // htmlElement.style.backgroundColor = "#ff00001f";
        listElement.remove();
        this.activeElements.delete(index);
      }
    }

    // Add new in-view elements
    const viewBoundStart = this.getViewBoundStart();
    const viewBoundEnd = this.getViewBoundEnd();
    for (let index = viewBoundStart.integer; index <= viewBoundEnd.integer; index++) {
      if (this.activeElements.has(index)) {
        // This one already exists
        continue;
      }

      const listElement = document.createElement("div");
      listElement.style.position = "absolute";
      listElement.style.top = `${this.getElementPosition(index).toString()}px`;
      listElement.dataset.elementIndex = `${index}`;
      listElement.append(this.getDocumentFragmentFromIndex(index));
      this.containerElement.appendChild(listElement);
      this.activeElements.add(index);
      // console.log(`add: ${index}`);
    }
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
  getElementPosition(index: bigint): MixedNumber {
    return MixedNumber.fromFloat(this.itemSize()).mulInt(index);
  }
  getTotalListSize(): MixedNumber {
    return MixedNumber.fromFloat(this.itemSize()).mulInt(this.itemCount());
  }
  getListEnd(): MixedNumber {
    return MixedNumber.fromFloat(this.itemSize()).mulInt(this.itemCount() + 1n);
  }
  isInView(index: bigint) {
    const rangeStart = this.getViewBoundStart();
    const rangeEnd = this.getViewBoundEnd();
    return index >= rangeStart.integer && index < rangeEnd.integer + 1n;
  }

  containerSizeUpdated(newSize: number) {
    console.log(`containerSizeUpdated newSize=${newSize}px`);
    this.containerElement.style.minHeight = `${newSize}px`;
    this.containerElement.style.maxHeight = `${newSize}px`;
    this.updateElements();
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
  ) {
    this.containerElement.style.position = "relative";
    this.containerElement.style.overflowY = "scroll";
    this.containerSizeUpdated(this.containerAvailableSize());

    // TODO: these are not really reliable, the container size can change independently of the window as well
    window.addEventListener("resize", () => {
      this.containerSizeUpdated(this.containerAvailableSize());
    });
    // window.addEventListener("scale", () => {
    //   this.containerSizeUpdated(this.containerAvailableSize());
    // });

    const scrollStop = document.createElement("div");
    scrollStop.textContent = "x";
    scrollStop.style.position = "absolute";
    scrollStop.style.top = `${this.getTotalListSize().min(BigScrollList.MAX_POSSIBLE_SCROLL).toString()}px`;
    scrollStop.style.maxHeight = "0px";
    scrollStop.style.visibility = "hidden";
    this.containerElement.appendChild(scrollStop);
    this.containerElement.addEventListener("scroll", () => {
      // console.log("scroll detected");
      this.currentScrollProgress = MixedNumber.fromFloat(this.containerElement.scrollTop / this.itemSize());
      this.updateElements();
    });
    this.updateElements();
    // setTimeout(() => {
    //   this.updateContainerElement();
    // }, 500); // TODO: do not use settimeout here???
  }
}

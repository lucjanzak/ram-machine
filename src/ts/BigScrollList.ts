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
  // TODO: better implementation, this can be lossless
  toString(): string {
    return `${this.value()}`;
  }

  static zero() {
    return new MixedNumber(0n, 0);
  }
}

export class BigScrollList {
  currentScrollProgress: MixedNumber = MixedNumber.zero();

  updateContainerElement() {
    // Analyze existing elements
    const existingElements: bigint[] = [];
    for (const listElement of this.containerElement.children) {
      const htmlElement = listElement as HTMLElement;
      const index = htmlElement.dataset.elementIndex;
      if (index === undefined) {
        // console.warn("Found element with no index!", listElement);
        continue;
      }

      const bigintIndex = BigInt(index);
      if (this.isInView(bigintIndex)) {
        existingElements.push(bigintIndex);
      } else {
        console.log("removing element out of view");
        listElement.remove();
      }
    }

    // Add new in-view elements
    const viewBoundStart = this.getViewBoundStart();
    const viewBoundEnd = this.getViewBoundEnd();
    for (let index = viewBoundStart.integer; index <= viewBoundEnd.integer; index++) {
      if (existingElements.includes(index)) {
        // This one already exists
        continue;
      }

      const listElement = document.createElement("div");
      listElement.style.position = "absolute";
      listElement.style.top = `${this.getElementPosition(index).toString()}px`;
      listElement.dataset.elementIndex = `${index}`;
      listElement.append(this.getDocumentFragmentFromIndex(index));
      this.containerElement.appendChild(listElement);
      console.log("adding element in view");
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
    this.containerElement.style.minHeight = `${this.containerAvailableSize()}px`;
    // this.containerElement.style.height = `${this.containerAvailableSize()}px`;
    this.containerElement.style.maxHeight = `${this.containerAvailableSize()}px`;
    this.containerElement.style.overflowY = "scroll";
    const decorativeElement = document.createElement("div");
    decorativeElement.textContent = "x";
    decorativeElement.style.position = "absolute";
    decorativeElement.style.top = `${this.getTotalListSize().toString()}px`;
    decorativeElement.style.maxHeight = `0px`;
    this.containerElement.appendChild(decorativeElement);
    this.containerElement.addEventListener("scroll", () => {
      console.log("scroll detected");
      this.currentScrollProgress = MixedNumber.fromFloat(this.containerElement.scrollTop / this.itemSize());
      this.updateContainerElement();
    });
    setTimeout(() => {
      this.updateContainerElement();
    }, 500); // TODO: do not use settimeout here???
  }
}

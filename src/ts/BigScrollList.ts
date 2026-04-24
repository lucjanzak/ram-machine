import { assert } from "node:console";
import { MixedNumber } from "./MixedNumber";
import { assertNever } from "./Util";

type ScrollListDirection = "vertical" | "horizontal";

export class BigScrollList {
  // On Chrome, the scrollstop "top" value is automatically bounded to the maximum possible value if it exceeds the limit.
  // The max value for Chrome is 33554432n, which is equal to `2147483648 * (1 / 64)`.
  // On Firefox, the maximum possible scrollstop "top" value is written below, which is equal to `2147483648 * (1 / 120)`:
  // static MAX_POSSIBLE_SCROLL = MixedNumber.fromFloat(2147483648 / 120).floor();
  static MAX_POSSIBLE_SCROLL = new MixedNumber(17895697n, 1 / 15).floor();

  currentScrollProgress: MixedNumber = MixedNumber.zero();
  activeElements: Set<bigint> = new Set();
  scrollStopElement: HTMLElement;

  setContainerAvailableSize(newSize: number) {
    if (newSize !== this.containerAvailableSize) {
      console.log(`containerSizeUpdated ${this.containerAvailableSize}px -> ${newSize}px`);
      this.containerAvailableSize = newSize;
      this.updateContainer();
      this.updateElements();
    }
  }

  setItemCount(newCount: bigint) {
    if (newCount !== this.itemCount) {
      console.log(`itemCount updated: ${this.itemCount} -> ${newCount}`);
      this.itemCount = newCount;
      this.updateScrollStop();
    }
  }

  setItemSize(newSize: number) {
    if (newSize !== this.itemSize) {
      console.warn("setItemSize not tested yet, it might not work properly");
      console.log(`itemSize updated: ${this.itemSize} -> ${newSize}`);
      this.itemSize = newSize;
      this.updateScrollStop();
      // TODO: all elements will have to be removed probably
      this.updateElements();
    }
  }

  updateContainer() {
    if (this.direction === "horizontal") {
      this.containerElement.style.minWidth = `${this.containerAvailableSize}px`;
      this.containerElement.style.maxWidth = `${this.containerAvailableSize}px`;
    } else if (this.direction === "vertical") {
      this.containerElement.style.minHeight = `${this.containerAvailableSize}px`;
      this.containerElement.style.maxHeight = `${this.containerAvailableSize}px`;
    } else {
      assertNever(this.direction);
    }
  }

  updateScrollStop() {
    if (this.direction === "horizontal") {
      this.scrollStopElement.style.left = `${this.getTotalListSize().min(BigScrollList.MAX_POSSIBLE_SCROLL).toString()}px`; // TODO: remove limit for chrome
    } else if (this.direction === "vertical") {
      this.scrollStopElement.style.top = `${this.getTotalListSize().min(BigScrollList.MAX_POSSIBLE_SCROLL).toString()}px`; // TODO: remove limit for chrome
    } else {
      assertNever(this.direction);
    }
  }

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
      if (this.direction === "horizontal") {
        listElement.style.left = `${this.getElementPosition(index).toString()}px`;
      } else if (this.direction === "vertical") {
        listElement.style.top = `${this.getElementPosition(index).toString()}px`;
      } else {
        assertNever(this.direction);
      }
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
    return MixedNumber.fromFloat(this.containerAvailableSize / this.itemSize);
  }
  getViewBoundEnd(): MixedNumber {
    return this.getViewBoundStart().add(this.getViewBoundSize());
  }
  getElementPosition(index: bigint): MixedNumber {
    return MixedNumber.fromFloat(this.itemSize).mulInt(index);
  }
  getTotalListSize(): MixedNumber {
    return MixedNumber.fromFloat(this.itemSize).mulInt(this.itemCount);
  }
  getListEnd(): MixedNumber {
    return MixedNumber.fromFloat(this.itemSize).mulInt(this.itemCount + 1n);
  }
  isInView(index: bigint) {
    const rangeStart = this.getViewBoundStart();
    const rangeEnd = this.getViewBoundEnd();
    return index >= rangeStart.integer && index < rangeEnd.integer + 1n;
  }

  constructor(
    public readonly containerElement: HTMLElement,

    public readonly direction: ScrollListDirection,

    // Amount of items in the list
    private itemCount: bigint,

    // The size of each item in px (each element must have the same length)
    private itemSize: number,

    // Get the DocumentFragment for a specific item in the list
    public getDocumentFragmentFromIndex: (index: bigint) => DocumentFragment,

    // Available size of the container
    private containerAvailableSize: number
  ) {
    this.containerElement.style.position = "relative";
    this.updateContainer();

    this.scrollStopElement = document.createElement("div");
    this.scrollStopElement.textContent = "x";
    this.scrollStopElement.style.position = "absolute";
    this.scrollStopElement.style.maxWidth = "0px";
    this.scrollStopElement.style.maxHeight = "0px";
    this.scrollStopElement.style.visibility = "hidden";
    this.updateScrollStop();

    this.containerElement.appendChild(this.scrollStopElement);
    this.containerElement.addEventListener("scroll", () => {
      // console.log("scroll detected");
      if (this.direction === "horizontal") {
        this.currentScrollProgress = MixedNumber.fromFloat(this.containerElement.scrollLeft / this.itemSize);
      } else if (this.direction === "vertical") {
        this.currentScrollProgress = MixedNumber.fromFloat(this.containerElement.scrollTop / this.itemSize);
      } else {
        assertNever(this.direction);
      }
      this.updateElements();
    });
    this.updateElements();

    if (direction === "horizontal") {
      this.containerElement.style.overflowX = "scroll";
    } else if (direction === "vertical") {
      this.containerElement.style.overflowY = "scroll";
    } else {
      assertNever(direction);
    }
  }
}

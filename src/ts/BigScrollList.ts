import { assert, time } from "node:console";
import { MixedNumber } from "./MixedNumber";
import { assertNever } from "./Util";
import { ElementManager, ManagedElement } from "./ElementManager";
import { bigintMax } from "./BigIntUtils";

type ScrollListDirection = "vertical" | "horizontal";

export class BigScrollList implements ElementManager {
  // On Chrome, the scrollstop "top" value is automatically bounded to the maximum possible value if it exceeds the limit.
  // The max value for Chrome is 33554432n, which is equal to `2147483648 * (1 / 64)`.
  // On Firefox, the maximum possible scrollstop "top" value is written below, which is equal to `2147483648 * (1 / 120)`:
  // static MAX_POSSIBLE_SCROLL = MixedNumber.fromFloat(2147483648 / 120).floor();
  static MAX_POSSIBLE_SCROLL = new MixedNumber(17895697n, 1 / 15).floor();
  static BUFFER_BEFORE = new MixedNumber(1n, 0.5);
  static BUFFER_AFTER = new MixedNumber(1n, 0.5);

  public readonly hostElement: ManagedElement<BigScrollList>;
  currentScrollProgress: MixedNumber = MixedNumber.zero();
  activeElements: Set<bigint> = new Set();
  scrollStopElement: HTMLElement;
  private scrollHandler;

  setContainerAvailableSize(newSize: number) {
    if (newSize !== this.containerAvailableSize) {
      // console.log(`containerSizeUpdated ${this.containerAvailableSize}px -> ${newSize}px`);
      this.containerAvailableSize = newSize;
      this.updateHostElement();
      this.updateElements();
    }
  }

  setItemCount(newCount: bigint) {
    if (newCount !== this.itemCount) {
      // console.log(`itemCount updated: ${this.itemCount} -> ${newCount}`);
      this.itemCount = newCount;
      this.updateScrollStop();
      this.updateElements();
    }
  }

  setItemSize(newSize: number) {
    if (newSize !== this.itemSize) {
      console.warn("setItemSize not tested yet, it might not work properly"); // TODO
      console.log(`itemSize updated: ${this.itemSize} -> ${newSize}`);
      this.itemSize = newSize;
      this.updateScrollStop();
      // TODO: all elements will have to be removed probably
      this.updateElements();
    }
  }

  updateHostElement() {
    if (this.direction === "horizontal") {
      this.hostElement.style.minWidth = `${this.containerAvailableSize}px`;
      this.hostElement.style.maxWidth = `${this.containerAvailableSize}px`;
    } else if (this.direction === "vertical") {
      this.hostElement.style.minHeight = `${this.containerAvailableSize}px`;
      this.hostElement.style.maxHeight = `${this.containerAvailableSize}px`;
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

  iterActive(callback: (element: HTMLElement, index: bigint) => void) {
    for (const listElement of this.hostElement.children) {
      const htmlElement = listElement as HTMLElement;
      const indexStr = htmlElement.dataset.elementIndex;
      if (indexStr === undefined) {
        continue;
      }
      const index = BigInt(indexStr);
      callback(htmlElement, index);
    }
  }

  updateElements() {
    // console.log("updateElements", this);
    // Analyze existing elements
    this.activeElements.clear();
    for (const listElement of this.hostElement.children) {
      const htmlElement = listElement as HTMLElement;
      const indexStr = htmlElement.dataset.elementIndex;
      if (indexStr === undefined) {
        // console.warn("Found element with no index property!", listElement);
        continue;
      }
      const index = BigInt(indexStr);

      if (this.isInView(index) || listElement.contains(document.activeElement)) {
        this.activeElements.add(index);
      } else {
        try {
          listElement.remove();
        } catch (e) {
          // sometimes removing a node can fail on Chrome, not much i can do about it
          console.warn(e);
        }
        this.activeElements.delete(index);
      }
    }

    // Add new in-view elements
    const viewBoundStart = this.getViewBoundStart();
    const viewBoundEnd = this.getViewBoundEnd();
    for (let index = bigintMax(viewBoundStart.integer, 0n); index <= viewBoundEnd.integer && index < this.itemCount; index++) {
      if (this.activeElements.has(index)) {
        // This one already exists
        continue;
      }

      const newListElement = document.createElement("div");
      newListElement.style.position = "absolute";
      if (this.direction === "horizontal") {
        newListElement.style.left = `${this.getElementPosition(index).toString()}px`;
      } else if (this.direction === "vertical") {
        newListElement.style.top = `${this.getElementPosition(index).toString()}px`;
      } else {
        assertNever(this.direction);
      }
      newListElement.dataset.elementIndex = `${index}`;
      newListElement.append(this.getDocumentFragmentFromIndex(index));

      // Find next child, the elements should be sorted (because otherwise Tabbing through elements is annoying)
      let nextChildInOrder: Node | null = null;
      for (const child of this.hostElement.children) {
        const htmlChild = child as HTMLElement;
        const childIndexStr = htmlChild.dataset.elementIndex;
        if (childIndexStr === undefined) continue;
        const childIndex = BigInt(childIndexStr);

        if (childIndex > index) {
          nextChildInOrder = child;
          break;
        }
      }
      this.hostElement.insertBefore(newListElement, nextChildInOrder);
      this.activeElements.add(index);
      // console.log(`add: ${index}`);
    }
  }

  getViewBoundStart(): MixedNumber {
    return this.currentScrollProgress.sub(BigScrollList.BUFFER_BEFORE);
  }
  getViewBoundSize(): MixedNumber {
    return MixedNumber.fromFloat(this.containerAvailableSize / this.itemSize)
      .add(BigScrollList.BUFFER_BEFORE)
      .add(BigScrollList.BUFFER_AFTER);
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
    hostElement: ManagedElement,

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
    // Clear host node
    // console.log("Old manager object: ", hostElement.managerObject);
    hostElement.innerHTML = "";
    if (hostElement.managerObject !== undefined) {
      hostElement.managerObject.onDemote();
    }

    this.hostElement = Object.assign(hostElement, { managerObject: this });
    this.hostElement.style.position = "relative";
    this.updateHostElement();

    this.scrollStopElement = document.createElement("div");
    this.scrollStopElement.textContent = "x";
    this.scrollStopElement.style.position = "absolute";
    this.scrollStopElement.style.maxWidth = "0px";
    this.scrollStopElement.style.maxHeight = "0px";
    this.scrollStopElement.style.visibility = "hidden";
    this.updateScrollStop();
    this.hostElement.appendChild(this.scrollStopElement);

    this.scrollHandler = () => {
      // console.log("scroll detected");
      if (this.direction === "horizontal") {
        this.currentScrollProgress = MixedNumber.fromFloat(this.hostElement.scrollLeft / this.itemSize);
      } else if (this.direction === "vertical") {
        this.currentScrollProgress = MixedNumber.fromFloat(this.hostElement.scrollTop / this.itemSize);
      } else {
        assertNever(this.direction);
      }
      this.updateElements();
    };

    this.hostElement.addEventListener("scroll", this.scrollHandler);
    this.updateElements();

    if (direction === "horizontal") {
      this.hostElement.style.overflowX = "scroll";
    } else if (direction === "vertical") {
      this.hostElement.style.overflowY = "scroll";
    } else {
      assertNever(direction);
    }
  }

  onDemote(): void {
    // console.log("this object is being demoted: ", this);
    this.hostElement.innerHTML = "";
    this.hostElement.removeEventListener("scroll", this.scrollHandler);
  }
}

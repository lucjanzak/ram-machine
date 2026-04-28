import { ContiguousArray } from "./BigArray";
import { bigintMax } from "./BigIntUtils";
import { BigScrollList } from "./BigScrollList";
import { t } from "./Localization";
import { select, Templates, useTemplate } from "./Nodes";

export interface OutputTape {
  write(value: bigint, quiet: boolean): void;
  clearAndReset(): void;
  refreshAllQuietlyUpdatedCells(): void;
}

export class OutputTapeArray implements OutputTape {
  private values = new ContiguousArray<bigint>();
  private currentIndex: bigint = 0n;
  private scrollList: BigScrollList | null = null;
  private quietlyUpdatedCells: Set<bigint> = new Set(); // TODO: this can be reduced to two integers (range start and range end) instead of a set

  // Minimum amount of cells to display on tape.
  static readonly MIN_ELEMENTS_ON_VISIBLE_TAPE = 3n as const;

  // Amount of "empty" tape cells displayed after the end of the output tape.
  static readonly EXTRA_ELEMENTS_ON_VISIBLE_TAPE = 3n as const;

  getValues(): readonly bigint[] {
    return this.values.asArray();
  }
  write(value: bigint, quiet: boolean) {
    this.values.push(value);
    if (quiet) {
      this.updateDOMCellLater(this.currentIndex);
    } else {
      this.updateDOMCellNow(this.currentIndex, value);
    }

    this.currentIndex++;
  }

  // this is never quiet
  clearAndReset() {
    this.values = new ContiguousArray();
    this.currentIndex = 0n;
    this.quietlyUpdatedCells = new Set();
    this.updateDOMListLength();
    this.refreshExistingCells();
  }

  updateDOMCellNow(index: bigint, value: bigint) {
    if (this.scrollList !== null) {
      const cell = this.scrollList.select(index);
      if (cell !== null) {
        this.updateCellElement(cell, value);
      }
      this.updateDOMListLength();
    }
  }

  updateDOMCellLater(index: bigint) {
    this.quietlyUpdatedCells.add(index);
  }

  updateDOMListLength() {
    if (this.scrollList !== null) {
      this.scrollList.setItemCount(
        bigintMax(this.values.length() + OutputTapeArray.EXTRA_ELEMENTS_ON_VISIBLE_TAPE, OutputTapeArray.MIN_ELEMENTS_ON_VISIBLE_TAPE)
      );
    }
    if (this.lengthElement !== null) {
      this.lengthElement.textContent = `${this.values.length()}`;
    }
  }

  refreshAllQuietlyUpdatedCells() {
    if (this.scrollList !== null) {
      console.log("refreshAllQuietlyUpdatedCells", this.quietlyUpdatedCells);
      this.scrollList.iterActive((listItem, index) => {
        if (this.quietlyUpdatedCells.has(index)) {
          const cell = select(listItem, "#output-tape-scroll-list-cell");
          this.updateCellElement(cell, this.values.get(index));
        }
      });
      this.updateDOMListLength();
    }
  }

  refreshExistingCells() {
    if (this.scrollList !== null) {
      console.log("refreshExistingCells");
      this.scrollList.iterActive((listItem, index) => {
        const cell = select(listItem, "#output-tape-scroll-list-cell");
        this.updateCellElement(cell, this.values.get(index));
      });
    }
  }

  private updateCellElement(cell: Element, value: bigint | undefined) {
    console.log(`updateCellElement #${cell.parentElement?.dataset.elementIndex}`);
    const valueInput = select<HTMLInputElement>(cell, "#value");
    if (value === undefined) {
      valueInput.value = "";
      valueInput.placeholder = t.outputTape.cellEmpty;
      cell.classList.add("empty");
    } else {
      valueInput.value = `${value}`;
      valueInput.placeholder = `${value}`;
      cell.classList.remove("empty");
    }
  }

  constructor(public hostElement: HTMLElement | null, public lengthElement: Element | null) {
    if (hostElement !== null) {
      this.scrollList = new BigScrollList(
        hostElement,
        "horizontal",
        3n, // initial element count
        120, // item size
        (index) => {
          const f = useTemplate(Templates.outputTapeCell);

          const cell = select(f, "#output-tape-scroll-list-cell");
          const indexSpan = select(f, "#index");
          const valueInput = select<HTMLInputElement>(f, "#value");

          if (index % 2n === 0n) {
            cell.classList.add("even");
          } else {
            cell.classList.add("odd");
          }
          indexSpan.textContent = `${index + 1n}`;

          const value = this.values.get(index);
          this.updateCellElement(cell, value);

          return f;
        },
        hostElement.parentElement!.clientWidth
      );

      // TODO: these are probably not reliable, the container size can change independently of the window as well
      window.addEventListener("resize", () => {
        if (this.scrollList !== null) {
          this.scrollList.setContainerAvailableSize(this.scrollList.hostElement.parentElement!.clientWidth);
        }
      });
    }
  }
}

export class OutputTapeMock implements OutputTape {
  private currentIndex: bigint = 0n;
  write(_value: bigint) {
    this.currentIndex++;
  }
  clearAndReset() {
    this.currentIndex = 0n;
  }
  refreshAllQuietlyUpdatedCells(): void {}
}

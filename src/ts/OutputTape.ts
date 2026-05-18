import { ContiguousArray } from "./BigArray";
import { bigintMax } from "./BigIntUtils";
import { BigScrollList } from "./BigScrollList";
import { t } from "./Localization";
import { select, Templates, useTemplate } from "./Nodes";
import { preferences } from "./Settings";

export interface OutputTape {
  write(value: bigint, quiet: boolean): void;
  clearAndReset(): void;
  refreshAllQuietlyUpdatedCells(): void;
}

export class OutputTapeArray implements OutputTape {
  protected values = new ContiguousArray<bigint>();
  protected currentIndex: bigint = 0n;

  write(value: bigint, _quiet: boolean) {
    this.values.push(value);
    this.currentIndex++;
  }

  clearAndReset() {
    this.values = new ContiguousArray();
    this.currentIndex = 0n;
  }

  refreshAllQuietlyUpdatedCells() {}
}

export class OutputTapeArrayDOM extends OutputTapeArray {
  private scrollList: BigScrollList | null = null;
  private quietlyUpdatedCells: Set<bigint> = new Set(); // TODO(optimize): this can be reduced to two integers (range start and range end) instead of a set

  // Minimum amount of cells to display on tape.
  static readonly MIN_ELEMENTS_ON_VISIBLE_TAPE = 3n as const;

  // Amount of "empty" tape cells displayed after the end of the output tape.
  static readonly EXTRA_ELEMENTS_ON_VISIBLE_TAPE = 3n as const;

  getValues(): readonly bigint[] {
    return this.values.asArray();
  }

  override write(value: bigint, quiet: boolean) {
    this.values.push(value);
    if (quiet) {
      this.updateDOMCellLater(this.currentIndex);
    } else {
      this.updateDOMCellNow(this.currentIndex, value);
      this.updateDOMListLength();
    }
    this.currentIndex++;
  }

  // this is never quiet
  override clearAndReset() {
    super.clearAndReset();
    this.quietlyUpdatedCells = new Set();
    this.updateDOMListLength();
    this.refreshExistingCells();
  }

  updateDOMCellNow(index: bigint, value: bigint) {
    if (this.scrollList === null) return;

    const listItem = this.scrollList.selectListItem(index);
    if (listItem === null) return;

    const cell = select(listItem, "#output-tape-scroll-list-cell");
    if (cell === null) return;
    this.updateCellElement(cell, value, true);
  }

  updateDOMCellLater(index: bigint) {
    this.quietlyUpdatedCells.add(index);
  }

  updateDOMListLength() {
    if (this.scrollList !== null) {
      this.scrollList.setItemCount(
        bigintMax(
          this.values.length() + OutputTapeArrayDOM.EXTRA_ELEMENTS_ON_VISIBLE_TAPE,
          OutputTapeArrayDOM.MIN_ELEMENTS_ON_VISIBLE_TAPE
        )
      );
    }
    if (this.lengthElement !== null) {
      this.lengthElement.textContent = `${this.values.length()}`;
    }
  }

  override refreshAllQuietlyUpdatedCells() {
    if (this.scrollList === null) return;

    this.scrollList.iterActive((listItem, index) => {
      if (this.quietlyUpdatedCells.has(index)) {
        const cell = select(listItem, "#output-tape-scroll-list-cell");
        this.updateCellElement(cell, this.values.get(index), true);
      }
    });
    this.quietlyUpdatedCells.clear();
    this.updateDOMListLength();
  }

  refreshExistingCells() {
    if (this.scrollList === null) return;

    this.scrollList.iterActive((listItem, index) => {
      const cell = select(listItem, "#output-tape-scroll-list-cell");
      this.updateCellElement(cell, this.values.get(index), true);
    });
  }

  private updateCellElement(cell: Element, value: bigint | undefined, animate: boolean) {
    // console.trace(`updateCellElement #${cell.parentElement?.dataset.elementIndex}`);
    const valueInput = select<HTMLInputElement>(cell, "#value");
    cell.classList.remove("animated");
    if (value === undefined) {
      valueInput.value = "";
      valueInput.placeholder = t.outputTape.cellEmpty;
      cell.classList.add("empty");
    } else {
      valueInput.value = `${value}`;
      valueInput.placeholder = `${value}`;
      cell.classList.remove("empty");
      if (animate) {
        // TODO(optional): maybe the color should stay highlighted until the next update?
        // that would require storing a list/set of all recently-updated cells
        cell.classList.add("animated");
      }
    }
  }

  constructor(hostElement: HTMLElement | null, public lengthElement: Element | null) {
    super();
    if (hostElement !== null) {
      this.scrollList = new BigScrollList(
        hostElement,
        "horizontal",
        3n, // initial element count
        120, // item size
        (index, visibleAlready) => {
          const f = useTemplate(Templates.outputTapeCell);

          const cell = select(f, "#output-tape-scroll-list-cell");
          const indexSpan = select(f, "#index");

          if (index % 2n === 0n) {
            cell.classList.add("even");
          } else {
            cell.classList.add("odd");
          }
          indexSpan.textContent = `${index + 1n}`;

          const value = this.values.get(index);
          this.updateCellElement(cell, value, visibleAlready);

          return f;
        },
        hostElement.parentElement!.clientWidth
      );

      if (hostElement.parentElement !== null) {
        const resizeObserver = new ResizeObserver(() => {
          if (this.scrollList !== null) {
            this.scrollList.setContainerAvailableSize(this.scrollList.hostElement.parentElement!.clientWidth);
          }
        });
        resizeObserver.observe(hostElement.parentElement);
      }
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

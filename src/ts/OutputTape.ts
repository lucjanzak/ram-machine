import { ContiguousArray } from "./BigArray";
import { BigScrollList } from "./BigScrollList";
import { t } from "./Localization";
import { select, Templates, useTemplate } from "./Nodes";

export interface OutputTape {
  write(value: bigint): void;
  clearAndReset(): void;
}

export class OutputTapeArray implements OutputTape {
  private values = new ContiguousArray<bigint>();
  private currentIndex: bigint = 0n;
  private scrollList: BigScrollList | null = null;
  getValues(): readonly bigint[] {
    return this.values.asArray();
  }
  write(value: bigint) {
    this.values.push(value);
    this.currentIndex++;
    this.refreshExistingCells(); // TODO: optimize, similar to registers/ use "quiet" and also animate
  }
  clearAndReset() {
    this.values = new ContiguousArray();
    this.currentIndex = 0n;
  }

  private updateCellValue(cell: Element, value: bigint | undefined) {
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

  refreshExistingCells() {
    if (this.scrollList !== null) {
      this.scrollList.iterActive((listItem, index) => {
        const cell = select(listItem, "#output-tape-scroll-list-cell");
        this.updateCellValue(cell, this.values.get(index));
      });
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
          this.updateCellValue(cell, value);

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
}

import { ContiguousArray } from "./BigArray";
import { bigintMax, bigintParse } from "./BigIntUtils";
import { BigScrollList } from "./BigScrollList";
import { t } from "./Localization";
import { randomBigint } from "./Memory";
import { select, Templates, useTemplate } from "./Nodes";
import { assertNever } from "./Util";

export type InputTapeUnderflowBehavior = "error" | "zero" | "random";

export interface InputTape {
  peek(): bigint | undefined;
  read(): bigint | undefined;
  readOrDefault(config: InputTapeUnderflowBehavior): bigint;
  reset(): void;
  clearAndReset(): void;
}

export class InputTapeArray implements InputTape {
  private values = new ContiguousArray<bigint>();
  private currentIndex: bigint = 0n;
  private scrollList: BigScrollList | null = null;

  // Minimum amount of cells to display on tape.
  static readonly MIN_ELEMENTS_ON_VISIBLE_TAPE = 3n as const;

  // Amount of "empty" tape cells displayed after the end of the input tape.
  // 0n => no empty cells; it is impossible to extend the tape beyond the size that it already is.
  // 1n => one empty cell; if focused, pressing Tab will skip to the next section instead of the next cell (because there is no 2nd empty cell)
  // 2n => two empty cells is the bare minimum; it fixes the Tab issue partially, but sometimes it can still happen
  // 3n => three empty cells is the recommended minimum; it fixes the Tab issue fully
  static readonly EXTRA_ELEMENTS_ON_VISIBLE_TAPE = 3n as const;

  peek() {
    return this.values.get(this.currentIndex);
  }
  read() {
    const value = this.values.get(this.currentIndex);
    this.currentIndex++;
    return value;
  }
  readOrDefault(config: InputTapeUnderflowBehavior) {
    const value = this.read();
    if (value === undefined) {
      if (config === "error") {
        throw new Error(`tried to read from input tape, but there is no more cells to read`);
      } else if (config === "zero") {
        return 0n;
      } else if (config === "random") {
        return randomBigint();
      } else {
        assertNever(config);
      }
    } else {
      return value;
    }
  }
  reset() {
    this.currentIndex = 0n;
  }
  clearAndReset() {
    this.values = new ContiguousArray();
    this.currentIndex = 0n;
  }

  updateListLength() {
    if (this.scrollList !== null) {
      this.scrollList.setItemCount(
        bigintMax(this.values.length() + InputTapeArray.EXTRA_ELEMENTS_ON_VISIBLE_TAPE, InputTapeArray.MIN_ELEMENTS_ON_VISIBLE_TAPE)
      );
    }
    if (this.lengthElement !== null) {
      this.lengthElement.textContent = `${this.values.length()}`;
    }
  }

  private updateCellValue(cell: Element, value: bigint | undefined) {
    const valueInput = select<HTMLInputElement>(cell, "#value");
    if (value === undefined) {
      valueInput.value = "";
      valueInput.placeholder = t.inputTape.cellEmpty;
      cell.classList.add("empty");
    } else {
      valueInput.value = `${value}`;
      valueInput.placeholder = `${value}`;
      cell.classList.remove("empty");
    }
    valueInput.classList.remove("invalid");
  }

  refreshExistingCells() {
    if (this.scrollList !== null) {
      this.scrollList.iterActive((listItem, index) => {
        const cell = select(listItem, "#input-tape-scroll-list-cell");
        this.updateCellValue(cell, this.values.get(index));
      });
    }
  }

  static fromText(text: string, hostElement: HTMLElement | null, lengthElement: Element | null): InputTape {
    if (text === "") {
      return InputTapeArray.fromValues([], hostElement, lengthElement);
    }

    const split = text.split(/[\s,]+/);
    const values = split
      .map((x): bigint | undefined => {
        try {
          const value = BigInt(x);
          return value;
        } catch (e) {
          console.warn(`Could not convert string '${x}' to bigint: `, e);
          return undefined;
        }
      })
      .filter((x) => x !== undefined);
    return InputTapeArray.fromValues(values, hostElement, lengthElement);
  }

  static fromValues(values: bigint[], hostElement: HTMLElement | null, lengthElement: Element | null) {
    const tape = new InputTapeArray(hostElement, lengthElement);
    for (const value of values) {
      // tape.values.push(...values); <-- this does not work for a very large amount of values
      tape.values.push(value);
    }
    tape.updateListLength();
    tape.refreshExistingCells();
    return tape;
  }
  constructor(hostElement: HTMLElement | null, public lengthElement: Element | null) {
    if (hostElement !== null) {
      this.scrollList = new BigScrollList(
        hostElement,
        "horizontal",
        0n, // initial element count
        120, // item size
        (index) => {
          const f = useTemplate(Templates.inputTapeCell);

          const cell = select(f, "#input-tape-scroll-list-cell");
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

          const updateValue = (confirmed: boolean) => {
            const valueText = valueInput.value;
            const value = bigintParse(valueText);
            // console.log(valueInput);
            // console.log(`Changed input tape cell #${index} to '${valueText}' ${value}`, confirmed);
            if (valueText === "") {
              // Empty value
              valueInput.classList.remove("invalid");

              // Remove from tape if this is the last element
              if (index === this.values.length() - 1n) {
                this.values.pop();
                this.updateCellValue(cell, undefined);
                this.updateListLength();
              }
            } else if (value === undefined) {
              // Invalid text inputted
              valueInput.classList.add("invalid");
            } else {
              // Valid value inputted
              valueInput.classList.remove("invalid");

              if (confirmed) {
                // Set the value in the actual tape array
                if (index >= this.values.length()) {
                  this.values.setWithFill(index, value, 0n);
                  this.refreshExistingCells();
                  this.scrollList?.updateVisibleElements();
                  this.updateListLength();
                } else {
                  this.values.update(index, value);
                }

                // Update the placeholder
                valueInput.placeholder = `${value}`;
                cell.classList.remove("empty");
              }
            }
          };

          valueInput.addEventListener("change", () => updateValue(true));
          valueInput.addEventListener("keyup", () => updateValue(false));
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

    this.updateListLength();
  }
}

// export class InputTapeMock implements InputTape {
//   private currentIndex: bigint = 0n;
//   read(): bigint | undefined {
//     // TODO
//     this.currentIndex++;
//     return 1n;
//   }
//   readOrDefault(): bigint {
//     this.currentIndex++;
//     return 1n;
//   }
//   reset(): void {
//     this.currentIndex = 0n;
//   }
//   clearAndReset(): void {
//     this.currentIndex = 0n;
//   }
// }

import { ContiguousArray } from "./BigArray";
import { bigintMax, bigintParse } from "./BigIntUtils";
import { BigScrollList } from "./BigScrollList";
import { readUnsetRegisterValue } from "./Memory";
import { select, Templates, useTemplate } from "./Nodes";

export interface InputTape {
  peek(): bigint | undefined;
  read(): bigint | undefined;
  readOrDefault(): bigint;
  reset(): void;
  clearAndReset(): void;
}

export class InputTapeArray implements InputTape {
  private values = new ContiguousArray<bigint>();
  private currentIndex: bigint = 0n;
  private scrollList: BigScrollList | null = null;
  peek() {
    return this.values.get(this.currentIndex);
  }
  read() {
    const value = this.values.get(this.currentIndex);
    this.currentIndex++;
    return value;
  }
  readOrDefault() {
    const value = this.read();
    if (value === undefined) {
      return readUnsetRegisterValue();
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
      this.scrollList.setItemCount(bigintMax(this.values.length() + 2n, 10n));
    }
    if (this.lengthElement !== null) {
      this.lengthElement.textContent = `${this.values.length()}`;
    }
  }

  refreshExistingItems() {
    if (this.scrollList !== null) {
      this.scrollList.iterActive((element, index) => {
        const valueInput = select<HTMLInputElement>(element, "#value");

        const value = this.values.get(index);
        if (value === undefined) {
          valueInput.value = "";
          valueInput.placeholder = "empty";
        } else {
          valueInput.value = `${value}`;
          valueInput.placeholder = `${value}`;
        }
        valueInput.classList.remove("invalid");
      });
    }
  }

  static fromText(text: string, hostElement: HTMLElement | null, lengthElement: Element | null): InputTape {
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
    tape.refreshExistingItems();
    return tape;
  }
  constructor(hostElement: HTMLElement | null, public lengthElement: Element | null) {
    if (hostElement !== null) {
      this.scrollList = new BigScrollList(
        hostElement,
        "horizontal",
        10n, // element count
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
          if (value === undefined) {
            valueInput.value = "";
            valueInput.placeholder = "empty";
          } else {
            valueInput.value = `${value}`;
            valueInput.placeholder = `${value}`;
          }

          const updateValue = (confirmed: boolean) => {
            const valueText = valueInput.value;
            const value = bigintParse(valueText);
            // console.log(valueInput);
            console.log(`Changed input tape cell #${index} to '${valueText}' ${value}`, confirmed);
            if (valueText === "") {
              // Empty value TODO- make it possible to remove values from the end????
              valueInput.classList.remove("invalid");
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
                  this.refreshExistingItems();
                  this.scrollList?.updateElements();
                  this.updateListLength();
                } else {
                  this.values.update(index, value);
                }

                // Update the placeholder
                valueInput.placeholder = `${value}`;
              }
            }
          };

          valueInput.addEventListener("change", () => updateValue(true));
          valueInput.addEventListener("keyup", () => updateValue(false));
          return f;
        },
        hostElement.parentElement!.clientWidth
      );

      // TODO: these are not really reliable, the container size can change independently of the window as well
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

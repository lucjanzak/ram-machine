import { ContiguousArray } from "./BigArray";
import { bigintMax } from "./BigIntUtils";
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
  static fromValues(values: bigint[], hostElement: HTMLElement | null) {
    const tape = new InputTapeArray(hostElement);
    tape.values.push(...values);
    return tape;
  }
  constructor(public hostElement: HTMLElement | null) {
    if (hostElement !== null) {
      this.scrollList = new BigScrollList(
        hostElement,
        "horizontal",
        10n, // element count
        200, // item size
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
          indexSpan.textContent = `${index}`;

          const value = this.values.get(index);
          if (value === undefined) {
            valueInput.value = "";
            valueInput.placeholder = "empty";
          } else {
            valueInput.value = `${value}`;
          }

          const updateValue = () => {
            const valueNum = valueInput.valueAsNumber;
            console.log(valueInput);
            console.log(`Changed input tape cell #${index} to ${valueNum}`);
            if (Number.isNaN(valueNum)) {
              valueInput.classList.add("invalid");
            } else {
              const value = BigInt(valueNum);
              valueInput.classList.remove("invalid");
              if (index >= this.values.length()) {
                this.values.setWithFill(index, value, 0n);

                if (this.scrollList !== null) {
                  this.scrollList.setItemCount(bigintMax(this.values.length() + 1n, 10n));
                }
              } else {
                this.values.update(index, value);
              }
            }
          };

          valueInput.addEventListener("change", () => updateValue());
          valueInput.addEventListener("keyup", () => updateValue());
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

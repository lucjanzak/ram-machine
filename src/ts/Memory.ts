import { SparseArray } from "./BigArray";
import { BigScrollList } from "./BigScrollList";
import { Nodes, select, useTemplate } from "./Nodes";
import { unwrap } from "./Util";

export function readUnsetRegisterValue() {
  // return 0n;
  // TODO: option for this: either 0n, or error out, or random value
  return BigInt(Math.floor(Math.random() * 10000));
}

export class Memory {
  private registers = new SparseArray<bigint>();
  private quietlyUpdatedRegisters = new Set<bigint>();
  private registerScrollList: BigScrollList | null = null;

  constructor(registerScrollListHostNode: HTMLElement | null) {
    if (registerScrollListHostNode !== null) {
      this.registerScrollList = new BigScrollList(
        registerScrollListHostNode,
        "vertical",
        20000000n, // element count
        30, // item size
        (index) => {
          const f = useTemplate(Nodes.registerRow);

          const row = select(f, "#register-scroll-list-row");
          const indexSpan = select(f, "#index");
          const valueSpan = select(f, "#value");

          if (index % 2n === 0n) {
            row.classList.add("even");
          } else {
            row.classList.add("odd");
          }
          indexSpan.textContent = `${index}`;

          const value = this.getRegisterState(index);
          if (value === undefined) {
            valueSpan.textContent = "uninitialized";
            valueSpan.classList.add("uninitialized");
          } else {
            valueSpan.textContent = `${value}`;
          }
          return f;
        },
        Nodes.registerScrollList.parentElement!.clientHeight
      );
    }

    // TODO: these are not really reliable, the container size can change independently of the window as well
    window.addEventListener("resize", () => {
      if (this.registerScrollList !== null) {
        this.registerScrollList.setContainerAvailableSize(Nodes.registerScrollList.parentElement!.clientHeight);
      }
    });
  }

  getAccumulator(): bigint {
    return this.getRegister(0n);
  }
  getRegister(index: bigint): bigint {
    const register = this.registers.get(index);
    if (register === undefined) {
      return readUnsetRegisterValue(); // Default value for unset registers
    } else {
      return register;
    }
  }
  getRegisterState(index: bigint): bigint | undefined {
    return this.registers.get(index);
  }
  setAccumulator(value: bigint, quiet: boolean) {
    this.setRegister(0n, value, quiet);
  }
  setRegister(index: bigint, value: bigint, quiet: boolean) {
    this.registers.set(index, value);
    if (quiet) {
      this.quietlyUpdatedRegisters.add(index);
    } else {
      this.updateRegisterRow(index, value);
    }
  }

  // This is never quiet
  clear() {
    for (const [index, _] of this.registers) {
      this.updateRegisterRow(index, undefined);
    }
    this.registers = new SparseArray();
  }

  sendUpdatesToAllQuietlyUpdatedRegisterRows() {
    console.log("update all", this.quietlyUpdatedRegisters);
    for (const i of this.quietlyUpdatedRegisters) {
      this.updateRegisterRow(i, unwrap(this.registers.get(i)));
    }
    this.quietlyUpdatedRegisters.clear();
  }

  updateRegisterRow(index: bigint, value: bigint | undefined) {
    // console.log("updateRegisterRow", index, value);
    if (this.registerScrollList !== null) {
      if (this.registerScrollList.isInView(index)) {
        const row = this.registerScrollList.containerElement.querySelector(`div[data-element-index="${index}"]`);
        if (row === null) {
          console.warn(
            `List element #${index} is in view, but there is no row element associated with it! (row === null)`,
            this.registerScrollList.containerElement
          );
        } else {
          const valueSpan = select(row, "#value");
          if (value === undefined) {
            valueSpan.textContent = "uninitialized";
            valueSpan.classList.add("uninitialized");
            row.animate(
              [
                { opacity: 0, transform: "scaleX(0%)" },
                { opacity: 1, transform: "scaleX(100%)" },
              ],
              { duration: 500, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
            );
          } else {
            valueSpan.textContent = `${value}`;
            valueSpan.classList.remove("uninitialized");
            // TODO: maybe the color should stay blue until the next update?
            // that would require storing a list/set of all recently-updated registers, and also probably a css class, instead of an animation
            row.animate(
              [
                { color: "blue", transform: "scale(120%)" },
                { color: "blue", transform: "scale(100%)" },
                { color: "blue", transform: "scale(100%)" },
                { color: "initial", transform: "scale(100%)" },
              ],
              { duration: 2000, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
            );
          }
        }
      }
    }
  }
}

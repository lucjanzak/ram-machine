import { SparseArray } from "./BigArray";
import { BigScrollList } from "./BigScrollList";
import { t } from "./Localization";
import { select, Templates, useTemplate } from "./Nodes";
import { RuntimeError, RuntimeException } from "./RuntimeError";
import { preferences, UninitializedRegisterReadBehavior } from "./Settings";
import { assertNever } from "./Util";

export function randomBigint(to: number = 10000) {
  const rand = BigInt(Math.floor(Math.random() * to));
  // console.trace("randomBigint: ", rand);
  return rand;
}

export class Memory {
  private registers = new SparseArray<bigint>();
  private scrollList: BigScrollList | null = null;
  private quietlyUpdatedRegisters = new Set<bigint>();

  getAccumulator(config: UninitializedRegisterReadBehavior, quiet: boolean): bigint {
    return this.getRegister(0n, config, quiet);
  }

  getRegister(index: bigint, config: UninitializedRegisterReadBehavior, quiet: boolean): bigint {
    const register = this.registers.get(index);
    if (register === undefined) {
      if (config === "error") {
        // TODO: display runtime error in status pane
        throw new RuntimeException(RuntimeError.uninitializedRegisterRead(index));
      } else if (config === "zero") {
        return 0n;
      } else if (config === "random") {
        return randomBigint();
      } else if (config === "superpositionCollapse") {
        const random = randomBigint();
        this.setRegister(index, random, quiet);
        return random;
      } else {
        assertNever(config);
      }
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
      this.updateDOMRowLater(index);
    } else {
      this.updateDOMRowNow(index, value);
    }
  }

  // This is never quiet
  clear() {
    this.registers = new SparseArray();
    this.quietlyUpdatedRegisters = new Set();
    this.refreshExistingRows();
  }

  updateDOMRowNow(index: bigint, value: bigint | undefined) {
    if (this.scrollList === null) return;

    const listItem = this.scrollList.selectListItem(index);
    if (listItem === null) return;

    const row = select(listItem, "#register-scroll-list-row");
    if (row === null) return;

    this.updateRegisterRowElement(row, value, true);
  }

  updateDOMRowLater(index: bigint) {
    this.quietlyUpdatedRegisters.add(index);
  }

  refreshAllQuietlyUpdatedRegisters() {
    if (this.scrollList === null) return;

    this.scrollList.iterActive((listItem, index) => {
      if (this.quietlyUpdatedRegisters.has(index)) {
        const row = select(listItem, "#register-scroll-list-row");
        this.updateRegisterRowElement(row, this.registers.get(index), true);
      }
    });
    this.quietlyUpdatedRegisters.clear();
  }

  refreshExistingRows() {
    if (this.scrollList === null) return;

    this.scrollList.iterActive((listItem, index) => {
      const row = select(listItem, "#register-scroll-list-row");
      this.updateRegisterRowElement(row, this.registers.get(index), true);
    });
  }

  private updateRegisterRowElement(row: Element, value: bigint | undefined, animate: boolean) {
    const valueSpan = select(row, "#value");
    row.classList.remove("animated");

    if (value === undefined) {
      valueSpan.textContent = t.registers.uninitialized;
      valueSpan.classList.add("uninitialized");
      if (animate && preferences.getAnimationsEnabled()) {
        row.animate(
          [
            { opacity: 0, transform: "scaleX(0%)" },
            { opacity: 1, transform: "scaleX(100%)" },
          ],
          { duration: 500, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
        );
      }
    } else {
      valueSpan.textContent = `${value}`;
      valueSpan.classList.remove("uninitialized");
      if (animate) {
        // TODO(optional): maybe the color should stay highlighted until the next update?
        // that would require storing a list/set of all recently-updated registers

        // row.classList.add("animated")
        setTimeout(() => row.classList.add("animated")); // TODO: fix this, doesn't work consistently without settimeout for some reason
      }
    }
  }

  constructor(hostElement: HTMLElement | null) {
    if (hostElement !== null) {
      this.scrollList = new BigScrollList(
        hostElement,
        "vertical",
        20000000n, // element count
        30, // item size
        (index) => {
          const f = useTemplate(Templates.registerRow);

          const row = select(f, "#register-scroll-list-row");
          const indexSpan = select(f, "#index");
          const _valueSpan = select(f, "#value");

          if (index % 2n === 0n) {
            row.classList.add("even");
          } else {
            row.classList.add("odd");
          }
          indexSpan.textContent = `${index}`;

          const value = this.getRegisterState(index);
          this.updateRegisterRowElement(row, value, false);
          return f;
        },
        hostElement.parentElement!.clientHeight
      );

      if (hostElement.parentElement !== null) {
        const resizeObserver = new ResizeObserver(() => {
          if (this.scrollList !== null) {
            this.scrollList.setContainerAvailableSize(this.scrollList.hostElement.parentElement!.clientHeight);
          }
        });
        resizeObserver.observe(hostElement.parentElement);
      }
    }
  }
}

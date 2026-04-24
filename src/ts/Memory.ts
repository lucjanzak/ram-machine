import { SparseArray } from "./BigArray";
import { BigScrollList } from "./BigScrollList";
import { Nodes, useTemplate } from "./Nodes";
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
        20000000n, // element count
        30, // item size
        (index) => {
          const f = useTemplate(Nodes.registerRow);

          const row = unwrap(f.querySelector("#register-list-row"));
          const indexSpan = unwrap(f.querySelector("#index"));
          const valueSpan = unwrap(f.querySelector("#value"));

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

  // TODO: add this as an option
  TODO_nonzeroRegisterRowElements: SparseArray<DocumentFragment> = new SparseArray();

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
    this.registers = new SparseArray();
    // console.log(this.TODO_nonzeroRegisterRows);
    for (const [_index, f] of this.TODO_nonzeroRegisterRowElements) {
      for (const child of f.children) {
        console.log("clearrr");
        // TODO: fix me, this function doesn't actually remove the nodes from the DOM
        child.remove();
      }
    }
    this.TODO_nonzeroRegisterRowElements.clear();
  }

  updateAllQuietlyUpdatedRegisterRows() {
    console.log("update all");
    for (const i of this.quietlyUpdatedRegisters) {
      this.updateRegisterRow(i, unwrap(this.registers.get(i)));
    }
    this.quietlyUpdatedRegisters.clear();
  }

  updateRegisterRow(index: bigint, value: bigint) {
    // TODO: move Nodes.registerRows inside this memory class, and make it nonstatic
    // TODO: also add "associatedElement" field, which would be the parent table of the rows
    console.log("updateRegisterRow", index, value);
    const storedFragment = this.TODO_nonzeroRegisterRowElements.get(index);
    if (storedFragment === undefined) {
      // Create new register row here
      const newFragment = useTemplate(Nodes.registerRow);
      unwrap(newFragment.querySelector("#index")).textContent = `${index}`;
      unwrap(newFragment.querySelector("#value")).textContent = `${value}`;
      this.TODO_nonzeroRegisterRowElements.set(index, newFragment);
      Nodes.registerScrollList.appendChild(newFragment);
      // console.log(newFragment);
      // console.log(Nodes.registerRows);
    } else {
      unwrap(storedFragment.querySelector("#value")).textContent = `${value}`;
    }
  }
}

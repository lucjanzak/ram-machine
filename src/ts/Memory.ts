import { SparseArray } from "./BigArray";
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
      Memory.updateRegisterRow(index, value);
    }
  }

  // This is never quiet
  clear() {
    this.registers = new SparseArray();
    console.log(Nodes.TODO_nonzeroRegisterRows);
    for (const [_index, f] of Nodes.TODO_nonzeroRegisterRows) {
      for (const child of f.children) {
        console.log("clearrr");
        // TODO: fix me, this function doesn't actually remove the nodes from the DOM
        child.remove();
      }
    }
    Nodes.TODO_nonzeroRegisterRows.clear();
  }

  updateAllQuietlyUpdatedRegisterRows() {
    console.log("update all");
    for (const i of this.quietlyUpdatedRegisters) {
      Memory.updateRegisterRow(i, unwrap(this.registers.get(i)));
    }
    this.quietlyUpdatedRegisters.clear();
  }

  static updateRegisterRow(index: bigint, value: bigint) {
    // TODO: move Nodes.registerRows inside this memory class, and make it nonstatic
    // TODO: also add "associatedElement" field, which would be the parent table of the rows
    console.log("updateRegisterRow", index, value);
    const storedFragment = Nodes.TODO_nonzeroRegisterRows.get(index);
    if (storedFragment === undefined) {
      // Create new register row here
      const newFragment = useTemplate(Nodes.registerRow);
      unwrap(newFragment.querySelector("#index")).textContent = `${index}`;
      unwrap(newFragment.querySelector("#value")).textContent = `${value}`;
      Nodes.TODO_nonzeroRegisterRows.set(index, newFragment);
      Nodes.registersScrollList.appendChild(newFragment);
      // console.log(newFragment);
      // console.log(Nodes.registerRows);
    } else {
      unwrap(storedFragment.querySelector("#value")).textContent = `${value}`;
    }
  }
}

import { formatString, t } from "./Localization";

export type RuntimeError = { message: string } & (
  | { id: "inputTapeUnderflow" | "programCounterOutOfBounds" }
  | { id: "undefinedLabel"; label: string }
  | { id: "uninitializedRegisterRead"; index: bigint }
);

const r = t.runtime;

export namespace RuntimeError {
  export function undefinedLabel(label: string): RuntimeError {
    return {
      id: "undefinedLabel",
      message: formatString(r.undefinedLabel, label),
      label,
    };
  }
  export function inputTapeUnderflow(): RuntimeError {
    return {
      id: "inputTapeUnderflow",
      message: r.inputTapeUnderflow,
    };
  }
  export function uninitializedRegisterRead(index: bigint): RuntimeError {
    return {
      id: "uninitializedRegisterRead",
      message: formatString(r.uninitializedRegisterRead, `${index}`),
      index,
    };
  }
  export function programCounterOutOfBounds(): RuntimeError {
    return {
      id: "programCounterOutOfBounds",
      message: r.programCounterOutOfBounds,
    };
  }
}

export class RuntimeException {
  constructor(public readonly msg: RuntimeError) {}
}

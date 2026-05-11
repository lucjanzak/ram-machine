export function assertNever(x: never, msg?: string): never {
  throw new Error(msg ?? "unexpected value " + String(x));
}

export function unwrap<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error(`unwrap of ${value}`);
  }
  return value;
}

export function expect<T>(value: T | null | undefined, msg: string): T {
  if (value === null || value === undefined) {
    throw new Error(`unwrap of ${value}: ${msg}`);
  }
  return value;
}

export function assert(condition: boolean, msg: string = "") {
  if (!condition) {
    throw new Error(`assertion failed: ${msg}`);
  }
}

export function assertEq(expected: any, actual: any, msg: string = "") {
  if (expected !== actual) {
    throw new Error(`assertion failed: expected !== actual (${expected} !== ${actual}): ${msg}`);
  }
}

export function unreachable(msg?: string): never {
  throw new Error(msg ?? "unreachable code block reached");
}

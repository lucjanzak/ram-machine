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
    throw new Error(`assertion failed${msg && `: ${msg}`}`);
  }
}

export function assertEq(actual: any, expected: any, msg: string = "") {
  if (expected !== actual) {
    throw new Error(`assertion failed: expected '${expected}', got '${actual}'${msg && `: ${msg}`}`);
  }
}

export function assertThrows<T extends ErrorConstructor>(
  fn: () => void,
  expected: T,
  expectedMessage?: string,
  msg: string = ""
) {
  try {
    fn();
  } catch (e) {
    if (!(e instanceof expected)) {
      throw new Error(
        `assertion failed: expected fn to throw exception of type ${expected}${
          expectedMessage && ` (with message: ${expectedMessage})`
        }, but it actually threw a different type of exception${msg && `: ${msg}`}`
      );
    }
    if (expectedMessage !== undefined && e.message !== expectedMessage) {
      throw new Error(
        `assertion failed: expected fn to throw exception with message: ${expectedMessage}, but the actual message was: ${
          e.message
        }${msg && `: ${msg}`}`
      );
    }
    return;
  }
  throw new Error(
    `assertion failed: expected fn to throw exception${
      expectedMessage && ` with message: ${expectedMessage}`
    }, but it did not throw${msg && `: ${msg}`}`
  );
}

export function assertJSON(actual: any, expected: any, msg: string = "") {
  const expectedJSON = JSON.stringify(expected);
  const actualJSON = JSON.stringify(actual);
  if (expectedJSON !== actualJSON) {
    throw new Error(
      `assertion failed: expected ${expected} (${expectedJSON}), got ${actual} (${actualJSON})${msg && `: ${msg}`}`
    );
  }
}

export function unreachable(msg?: string): never {
  throw new Error(msg ?? "unreachable code block reached");
}

export function todo(msg?: string): never {
  throw new Error(msg ?? "not implemented yet");
}

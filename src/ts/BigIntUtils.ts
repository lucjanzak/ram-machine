export function bigintMax(a: bigint, b: bigint) {
  if (b > a) {
    return b;
  } else {
    return a;
  }
}

export function bigintMin(a: bigint, b: bigint) {
  if (b < a) {
    return b;
  } else {
    return a;
  }
}

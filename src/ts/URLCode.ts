import { DEFAULT_PROGRAM_ASSEMBLY } from "./Examples";
import { assertEq, assertJSON, assertThrows, unwrap } from "./Util";
import * as LZString from "lz-string";

export const BASE64_RATIO = 4 / 3;

export type URLData =
  | {
      version: 0;
      sourceCode: string;
    }
  | {
      version: 1;
      sourceCode: string;
      compressedSourceCode: string;
      ratio: number;
    };

function base64ToBytes(base64: string) {
  const binString = atob(base64);
  return Uint8Array.from(binString, (m) => unwrap(m.codePointAt(0)));
}

function bytesToBase64(bytes: Uint8Array) {
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
  return btoa(binString);
}

export function decodeURLHashData(locationHash: string, silent = false): null | URLData {
  if (locationHash === "") {
    // No data
    return null;
  }

  if (!locationHash.startsWith("#")) {
    throw new Error("string does not begin with hash");
  }

  const encodedInfo = locationHash.slice(1);
  const versionDividerIndex = encodedInfo.indexOf("-");
  if (versionDividerIndex === -1) {
    throw new Error("version divider character not found");
  }

  const version = parseInt(encodedInfo.slice(0, versionDividerIndex));
  if (Number.isNaN(version)) {
    throw new Error("could not decode version number");
  }

  if (version === 0) {
    const encodedSourceCode = encodedInfo.slice(versionDividerIndex + 1);
    const sourceCode = new TextDecoder().decode(base64ToBytes(encodedSourceCode));
    return { version: 0, sourceCode };
  } else if (version === 1) {
    const compressedSourceCode = encodedInfo.slice(versionDividerIndex + 1);
    const sourceCode = LZString.decompressFromBase64(compressedSourceCode);
    const ratio = compressedSourceCode.length / sourceCode.length;
    if (!silent)
      console.log(
        `Decompressed source code; compression ratio: ${(ratio * 100).toFixed(2)}% (~${(
          (ratio / BASE64_RATIO) *
          100
        ).toFixed(2)}% when compared to BASE64)`
      );
    return { version: 1, sourceCode, compressedSourceCode, ratio };
  } else {
    throw new Error(`unknown version number: ${version}`);
  }
}

export function encodeURLHashData(
  sourceCode: string,
  version: number = 1,
  silent = false
): { hash: string; ratio: number } {
  if (version === 0) {
    const sourceBytes = new TextEncoder().encode(sourceCode);
    const encodedSourceCode = bytesToBase64(sourceBytes);
    const encodedInfo = `#${version}-${encodedSourceCode}`;
    return { hash: encodedInfo, ratio: BASE64_RATIO };
  } else if (version === 1) {
    const compressedSourceCode = LZString.compressToBase64(sourceCode);
    const ratio = compressedSourceCode.length / sourceCode.length;
    if (!silent)
      console.log(
        `Compressed source code; compression ratio: ${(ratio * 100).toFixed(2)}% (~${(
          (ratio / BASE64_RATIO) *
          100
        ).toFixed(2)}% when compared to Base64)`
      );
    const encodedInfo = `#${version}-${compressedSourceCode}`;
    return { hash: encodedInfo, ratio };
  } else {
    throw new Error("unknown version number");
  }
}

namespace Test {
  assertEq(decodeURLHashData(""), null);
  assertThrows(() => decodeURLHashData("a"), Error, "string does not begin with hash");
  assertThrows(() => decodeURLHashData("#"), Error, "version divider character not found");
  assertThrows(() => decodeURLHashData("#123"), Error, "version divider character not found");
  assertThrows(() => decodeURLHashData("#123-adsf"), Error, "unknown version number: 123");
  assertThrows(() => decodeURLHashData("#9-adsf"), Error, "unknown version number: 9");
  assertJSON(decodeURLHashData("#0-aGk="), { version: 0, sourceCode: "hi" });
  assertJSON(decodeURLHashData("#0-xIU="), { version: 0, sourceCode: "ą" });
  assertJSON(decodeURLHashData("#1-BYSyA===", true), {
    version: 1,
    sourceCode: "hi",
    compressedSourceCode: "BYSyA===",
    ratio: 4,
  });
  assertJSON(decodeURLHashData("#1-qCAQ", true), {
    version: 1,
    sourceCode: "ą",
    compressedSourceCode: "qCAQ",
    ratio: 4,
  });
  assertEq(encodeURLHashData("hi", 0).hash, "#0-aGk=");
  assertEq(encodeURLHashData("ą", 0).hash, "#0-xIU=");
  assertEq(encodeURLHashData("hi", 1, true).hash, "#1-BYSyA===");
  assertEq(encodeURLHashData("ą", 1, true).hash, "#1-qCAQ");
}

window.addEventListener("hashchange", (e) => {
  try {
    const decoded = decodeURLHashData(window.location.hash);
    if (decoded === null) {
      window.RAMMachine.machine.loadAssemblyAndReset("");
    } else {
      window.RAMMachine.machine.loadAssemblyAndReset(decoded.sourceCode);
    }
  } catch (e) {
    console.error("could not open file from hash:", e);
  }
});

export function loadInitialHash() {
  try {
    const decoded = decodeURLHashData(window.location.hash);
    if (decoded === null) {
      window.RAMMachine.machine.loadAssemblyAndReset(DEFAULT_PROGRAM_ASSEMBLY);
      window.RAMMachine.machine.loadTapeFromText("2,3");
    } else {
      window.RAMMachine.machine.loadAssemblyAndReset(decoded.sourceCode);
    }
  } catch {
    window.RAMMachine.machine.loadAssemblyAndReset(DEFAULT_PROGRAM_ASSEMBLY);
    window.RAMMachine.machine.loadTapeFromText("2,3");
  }
}

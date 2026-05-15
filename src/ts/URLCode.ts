import { assertEq, assertJSON, assertThrows, unwrap } from "./Util";

export type URLData = {
  version: 0;
  sourceCode: string;
};

function base64ToBytes(base64: string) {
  const binString = atob(base64);
  return Uint8Array.from(binString, (m) => unwrap(m.codePointAt(0)));
}

function bytesToBase64(bytes: Uint8Array) {
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
  return btoa(binString);
}

export function decodeURLHashData(locationHash: string): null | URLData {
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
  } else {
    throw new Error(`unknown version number: ${version}`);
  }
}

export function encodeURLHashData(sourceCode: string): string {
  const version = 0;
  const sourceBytes = new TextEncoder().encode(sourceCode);
  const encodedSourceCode = bytesToBase64(sourceBytes);
  const encodedInfo = `#${version}-${encodedSourceCode}`;
  return encodedInfo;
}

namespace Test {
  assertEq(decodeURLHashData(""), null);
  assertThrows(() => decodeURLHashData("a"), Error, "string does not begin with hash");
  assertThrows(() => decodeURLHashData("#"), Error, "version divider character not found");
  assertThrows(() => decodeURLHashData("#123"), Error, "version divider character not found");
  assertThrows(() => decodeURLHashData("#123-adsf"), Error, "unknown version number: 123");
  assertThrows(() => decodeURLHashData("#1-adsf"), Error, "unknown version number: 1");
  assertJSON(decodeURLHashData("#0-aGk="), { version: 0, sourceCode: "hi" });
  assertJSON(decodeURLHashData("#0-xIU="), { version: 0, sourceCode: "ą" });
  assertEq(encodeURLHashData("hi"), "#0-aGk=");
  assertEq(encodeURLHashData("ą"), "#0-xIU=");
}

window.addEventListener("hashchange", (e) => {
  // console.log("HASH CHANGE", e, window.location.hash);
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

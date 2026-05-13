import { t } from "./Localization";

export type CompileMessageBody =
  | ({ category: "parser" } & ParserError)
  | ({ category: "preprocessor" } & PreprocessorError);
export type ParserError = { message: string } & (
  | { id: "immediateWritableOperand" | "negativeRegister" | "emptyLabel" }
  | { id: "bigintParseError"; operand: string }
  | { id: "unrecognizedMnemonic"; mnemonic: string }
  | { id: "redefinedLabel"; originalLine: number; label: string }
);
export type PreprocessorError = { message: string } & (
  | { id: "setInvalidKey"; key: string }
  | { id: "setInvalidValue"; key: string; value: string }
  | { id: "unknownDirective"; commandName: string }
);
const pp = t.compiler.preprocessor;
const p = t.compiler.parser;

export namespace ParserError {
  export function immediateWritableOperand(): ParserError {
    return {
      id: "immediateWritableOperand",
      message: p.immediateWritableOperand,
    };
  }
  export function emptyLabel(): ParserError {
    return { id: "emptyLabel", message: p.emptyLabel };
  }
  export function negativeRegister(): ParserError {
    return { id: "negativeRegister", message: p.negativeRegister };
  }
  export function bigintParseError(operand: string): ParserError {
    return { id: "bigintParseError", message: `${p.bigintParseError}: ${operand}`, operand };
  }
  export function unrecognizedMnemonic(mnemonic: string): ParserError {
    return { id: "unrecognizedMnemonic", message: `${p.unrecognizedMnemonic}: ${mnemonic}`, mnemonic };
  }
  export function redefinedLabel(originalLine: number, label: string): ParserError {
    return { id: "redefinedLabel", message: `${p.redefinedLabel} ${originalLine}: '${label}'`, originalLine, label };
  }
}

export namespace PreprocessorError {
  export function setInvalidKey(key: string): PreprocessorError {
    return { id: "setInvalidKey", message: `${pp.setInvalidKey}: ${key}, ${pp.genericIgnoreWarning}`, key };
  }
  export function setInvalidValue(key: string, value: string): PreprocessorError {
    return {
      id: "setInvalidValue",
      message: `${pp.setInvalidValue} '${key}': ${value}, ${pp.genericIgnoreWarning}`,
      key,
      value,
    };
  }
  export function unknownDirective(commandName: string): PreprocessorError {
    return {
      id: "unknownDirective",
      message: `${pp.unknownDirective}: ${commandName}, ${pp.genericIgnoreWarning}`,
      commandName,
    };
  }
}

import { formatString, t } from "./Localization";

export type CompilerError = ({ category: "parser" } & ParserError) | ({ category: "preprocessor" } & PreprocessorError);
export type ParserError = { message: string } & (
  | {
      id:
        | "immediateWritableOperand"
        | "negativeRegister"
        | "negativeImmediate"
        | "emptyLabel"
        | "bigintExpected"
        | "labelExpected";
    }
  | { id: "unexpectedOperand"; operand: string }
  | { id: "bigintParseError"; operand: string }
  | { id: "unrecognizedMnemonic"; mnemonic: string }
  | { id: "invalidLabel"; label: string }
  | { id: "redefinedLabel"; originalLine: number; label: string }
  | { id: "labelAtTheEnd"; label: string }
);
export type PreprocessorError = { message: string } & (
  | { id: "setInvalidKey"; key: string }
  | { id: "setInvalidValue"; key: string; value: string; validValuesHint?: string[] }
  | { id: "setMissingValue"; key: string }
  | { id: "unknownDirective"; commandName: string }
  | { id: "expectedDirective" | "expectedArguments" }
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
  export function invalidLabel(label: string): ParserError {
    return { id: "invalidLabel", message: formatString(p.invalidLabel, label), label };
  }
  export function negativeRegister(): ParserError {
    return { id: "negativeRegister", message: p.negativeRegister };
  }
  export function negativeImmediate(): ParserError {
    return { id: "negativeImmediate", message: p.negativeImmediate };
  }
  export function bigintParseError(operand: string): ParserError {
    return { id: "bigintParseError", message: formatString(p.bigintParseError, operand), operand };
  }
  export function bigintExpected(): ParserError {
    return { id: "bigintExpected", message: p.bigintExpected };
  }
  export function labelExpected(): ParserError {
    return { id: "labelExpected", message: p.labelExpected };
  }
  export function unexpectedOperand(operand: string): ParserError {
    return { id: "unexpectedOperand", message: formatString(p.unexpectedOperand, operand), operand };
  }
  export function unrecognizedMnemonic(mnemonic: string): ParserError {
    return { id: "unrecognizedMnemonic", message: formatString(p.unrecognizedMnemonic, mnemonic), mnemonic };
  }
  export function redefinedLabel(originalLine: number, label: string): ParserError {
    return {
      id: "redefinedLabel",
      message: formatString(p.redefinedLabel, label, `${originalLine}`),
      originalLine,
      label,
    };
  }
  export function labelAtTheEnd(label: string): ParserError {
    return { id: "labelAtTheEnd", message: formatString(p.labelAtTheEnd, label), label };
  }
}

export namespace PreprocessorError {
  export function setInvalidKey(key: string): PreprocessorError {
    return { id: "setInvalidKey", message: `${pp.setInvalidKey}: ${key}; ${pp.genericIgnoreWarning}`, key };
  }
  export function setInvalidValue(key: string, value: string, validValuesHint?: string[]): PreprocessorError {
    return {
      id: "setInvalidValue",
      message:
        validValuesHint === undefined
          ? `${formatString(pp.setInvalidValue, key, value)}; ${pp.genericIgnoreWarning}`
          : `${formatString(
              pp.setInvalidValueWithHint,
              key,
              value,
              validValuesHint.map((x) => `'${x}'`).join(", ")
            )}; ${pp.genericIgnoreWarning}`,
      key,
      value,
      validValuesHint,
    };
  }
  export function setMissingValue(key: string): PreprocessorError {
    return {
      id: "setMissingValue",
      message: `${formatString(pp.setMissingValue, key)}; ${pp.genericIgnoreWarning}`,
      key,
    };
  }
  export function unknownDirective(commandName: string): PreprocessorError {
    return {
      id: "unknownDirective",
      message: `${formatString(pp.unknownDirective, commandName)}; ${pp.genericIgnoreWarning}`,
      commandName,
    };
  }
  export function expectedDirective(): PreprocessorError {
    return {
      id: "expectedDirective",
      message: `${pp.expectedDirective}; ${pp.genericIgnoreWarning}`,
    };
  }
  export function expectedArguments(): PreprocessorError {
    return { id: "expectedArguments", message: `${pp.expectedArguments}; ${pp.genericIgnoreWarning}` };
  }
}

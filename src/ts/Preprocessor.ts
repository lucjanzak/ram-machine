import { t } from "./Localization";
import { ParserMessage } from "./Parser";
import {
  InputTapeUnderflowBehavior,
  MachineSettings,
  ProgramCounterOutOfBoundsBehavior,
  UninitializedRegisterReadBehavior,
} from "./Settings";

export type PreprocessorMessage = ParserMessage;

export type PreprocessorOutput = {
  inputTapeString: string | null;
  inputTapeUnderflow: InputTapeUnderflowBehavior | null;
  uninitializedRegisterRead: UninitializedRegisterReadBehavior | null;
  programCounterOutOfBounds: ProgramCounterOutOfBoundsBehavior | null;
  assembly: string;
  messages: PreprocessorMessage[];
};

export function preprocess(sourceText: string): PreprocessorOutput {
  // ;.INPUT_TAPE 12,31,231,23,123
  // ;.SET INPUT_TAPE_UNDERFLOW zero
  // ;.SET UNINITIALIZED_REGISTER_READ random
  // ;.SET PROGRAM_COUNTER_OUT_OF_BOUNDS actAsHalt

  sourceText.split("\n");
  const assemblyLines: string[] = [];
  const output: PreprocessorOutput = {
    inputTapeString: null,
    inputTapeUnderflow: null,
    uninitializedRegisterRead: null,
    programCounterOutOfBounds: null,
    assembly: "",
    messages: [],
  };

  sourceText.split("\n").forEach((line, lineIndex) => {
    if (!line.startsWith(";.")) {
      assemblyLines.push(line);
      return;
    }

    const warn = (msg: string) => {
      const lineNumber = lineIndex + 1;
      console.warn(msg, lineNumber);
      output.messages.push({
        type: "warning",
        message: msg,
        line: lineNumber,
      });
      console.trace(output);
    };

    const warnInvalidValue = (key: string, value: string) => {
      warn(
        `${t.compiler.preprocessor.warning.setInvalidValue} '${key}': ${value}, ${t.compiler.preprocessor.warning.genericIgnoring}`
      );
    };

    const directive = line.slice(2).trim();
    let [commandName, remaining, _] = directive.split(/\s+(.*)/s);
    commandName = commandName.toUpperCase();
    if (commandName === "INPUT_TAPE") {
      output.inputTapeString = remaining;
    } else if (commandName === "SET") {
      let [settingKey, settingValue, _] = remaining.split(/\s+(.*)/s);
      settingKey = settingKey.toUpperCase();
      if (settingKey === "INPUT_TAPE_UNDERFLOW") {
        const parsed = MachineSettings.parseInputTapeUnderflowBehavior(settingValue);
        if (parsed === null) warnInvalidValue("INPUT_TAPE_UNDERFLOW", settingValue);
        else output.inputTapeUnderflow = parsed;
      } else if (settingKey === "UNINITIALIZED_REGISTER_READ") {
        const parsed = MachineSettings.parseUninitializedRegisterReadBehavior(settingValue);
        if (parsed === null) warnInvalidValue("UNINITIALIZED_REGISTER_READ", settingValue);
        else output.uninitializedRegisterRead = parsed;
      } else if (settingKey === "PROGRAM_COUNTER_OUT_OF_BOUNDS") {
        const parsed = MachineSettings.parseProgramCounterOutOfBoundsBehavior(settingValue);
        if (parsed === null) warnInvalidValue("PROGRAM_COUNTER_OUT_OF_BOUNDS", settingValue);
        else output.programCounterOutOfBounds = parsed;
      } else {
        warn(
          `${t.compiler.preprocessor.warning.setInvalidKey}: ${settingKey}, ${t.compiler.preprocessor.warning.genericIgnoring}`
        );
      }
    } else {
      warn(
        `${t.compiler.preprocessor.warning.unknownDirective}: ${commandName}, ${t.compiler.preprocessor.warning.genericIgnoring}`
      );
    }
  });
  output.assembly = assemblyLines.join("\n");
  return output;
}

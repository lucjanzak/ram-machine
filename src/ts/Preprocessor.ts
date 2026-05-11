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
  // ;.SET INPUT_TAPE_UNDERFLOW 123
  // ;.SET UNINITIALIZED_REGISTER_READ 123
  // ;.SET PROGRAM_COUNTER_OUT_OF_BOUNDS 123

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

    const directive = line.slice(2).trim();
    let [commandName, remaining, _] = directive.split(/\s+(.*)/s);
    commandName = commandName.toUpperCase();
    if (commandName === "INPUT_TAPE") {
      output.inputTapeString = remaining;
    } else if (commandName === "SET") {
      let [settingName, settingValue, _] = remaining.split(/\s+(.*)/s);
      settingName = settingName.toUpperCase();
      if (settingName === "INPUT_TAPE_UNDERFLOW") {
        const parsed = MachineSettings.parseInputTapeUnderflowBehavior(settingValue);
        if (parsed === null) warn(`Could not parse INPUT_TAPE_UNDERFLOW value: ${settingValue}`);
        output.inputTapeUnderflow = parsed;
      } else if (settingName === "UNINITIALIZED_REGISTER_READ") {
        const parsed = MachineSettings.parseUninitializedRegisterReadBehavior(settingValue);
        if (parsed === null) warn(`Could not parse UNINITIALIZED_REGISTER_READ value: ${settingValue}`);
        output.uninitializedRegisterRead = parsed;
      } else if (settingName === "PROGRAM_COUNTER_OUT_OF_BOUNDS") {
        const parsed = MachineSettings.parseProgramCounterOutOfBoundsBehavior(settingValue);
        if (parsed === null) warn(`Could not parse PROGRAM_COUNTER_OUT_OF_BOUNDS value: ${settingValue}`);
        output.programCounterOutOfBounds = parsed;
      }
    }
  });
  output.assembly = assemblyLines.join("\n");
  return output;
}

import { CompileMessageBody, PreprocessorError } from "./CompileError";
import { t } from "./Localization";
import { CompilerMessage } from "./Parser";
import {
  InputTapeUnderflowBehavior,
  MachineSettings,
  ProgramCounterOutOfBoundsBehavior,
  UninitializedRegisterReadBehavior,
} from "./Settings";

export type PreprocessorOutput = {
  inputTapeString: string | null;
  inputTapeUnderflow: InputTapeUnderflowBehavior | null;
  uninitializedRegisterRead: UninitializedRegisterReadBehavior | null;
  programCounterOutOfBounds: ProgramCounterOutOfBoundsBehavior | null;
  assembly: string;
  messages: CompilerMessage[];
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

    const warn = (msg: PreprocessorError) => {
      const lineNumber = lineIndex + 1;
      const body = Object.assign(msg, { category: "preprocessor" as const });
      console.warn(body, lineNumber);
      output.messages.push({
        type: "warning",
        body,
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
      let [settingKey, settingValue, _] = remaining.split(/\s+(.*)/s);
      settingKey = settingKey.toUpperCase();
      if (settingKey === "INPUT_TAPE_UNDERFLOW") {
        const parsed = MachineSettings.parseInputTapeUnderflowBehavior(settingValue);
        if (parsed === null) warn(PreprocessorError.setInvalidValue("INPUT_TAPE_UNDERFLOW", settingValue));
        else output.inputTapeUnderflow = parsed;
      } else if (settingKey === "UNINITIALIZED_REGISTER_READ") {
        const parsed = MachineSettings.parseUninitializedRegisterReadBehavior(settingValue);
        if (parsed === null) warn(PreprocessorError.setInvalidValue("UNINITIALIZED_REGISTER_READ", settingValue));
        else output.uninitializedRegisterRead = parsed;
      } else if (settingKey === "PROGRAM_COUNTER_OUT_OF_BOUNDS") {
        const parsed = MachineSettings.parseProgramCounterOutOfBoundsBehavior(settingValue);
        if (parsed === null) warn(PreprocessorError.setInvalidValue("PROGRAM_COUNTER_OUT_OF_BOUNDS", settingValue));
        else output.programCounterOutOfBounds = parsed;
      } else {
        warn(PreprocessorError.setInvalidKey(settingKey));
      }
    } else {
      warn(PreprocessorError.unknownDirective(commandName));
    }
  });
  output.assembly = assemblyLines.join("\n");
  return output;
}

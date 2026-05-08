import { Dialogs, Nodes, select } from "./Nodes";

export type InputTapeUnderflowBehavior = "error" | "zero" | "random";
export type UninitializedRegisterReadBehavior = "error" | "zero" | "random" | "superpositionCollapse";
export type ProgramCounterOutOfBoundsBehavior = "error" | "actAsHalt";

export class MachineSettings {
  inputTapeUnderflow: InputTapeUnderflowBehavior = "error";
  uninitializedRegisterRead: UninitializedRegisterReadBehavior = "zero";
  programCounterOutOfBounds: ProgramCounterOutOfBoundsBehavior = "error";

  static parseInputTapeUnderflowBehavior(input: FormDataEntryValue | null): InputTapeUnderflowBehavior | null {
    if (input === "error" || input === "zero" || input === "random") return input;
    return null;
  }

  static parseUninitializedRegisterReadBehavior(input: FormDataEntryValue | null): UninitializedRegisterReadBehavior | null {
    if (input === "error" || input === "zero" || input === "random" || input === "superpositionCollapse") return input;
    return null;
  }

  static parseProgramCounterOutOfBoundsBehavior(input: FormDataEntryValue | null): ProgramCounterOutOfBoundsBehavior | null {
    if (input === "error" || input === "actAsHalt") return input;
    return null;
  }

  static fromForm(formData: FormData): MachineSettings {
    return {
      inputTapeUnderflow: MachineSettings.parseInputTapeUnderflowBehavior(formData.get("input-tape-underflow-behavior")) || "error",
      uninitializedRegisterRead: MachineSettings.parseUninitializedRegisterReadBehavior(formData.get("uninitialized-register-read-behavior")) || "error",
      programCounterOutOfBounds: MachineSettings.parseProgramCounterOutOfBoundsBehavior(formData.get("program-counter-out-of-bounds-behavior")) || "error",
    };
  }

  static simulationDefaults(): MachineSettings {
    const settings = new MachineSettings();
    settings.inputTapeUnderflow = "zero";
    settings.programCounterOutOfBounds = "actAsHalt";
    settings.uninitializedRegisterRead = "zero";
    return settings;
  }
}


export function updateSettingsDOM(settings: MachineSettings) {
  select<HTMLInputElement>(Nodes.settingsForm, `#input-tape-underflow-${settings.inputTapeUnderflow}`).checked = true;
  select<HTMLInputElement>(Nodes.settingsForm, `#uninitialized-register-read-${settings.uninitializedRegisterRead}`).checked = true;
  select<HTMLInputElement>(Nodes.settingsForm, `#program-counter-out-of-bounds-${settings.programCounterOutOfBounds}`).checked = true;
}

export function initSettingsDOM() {
  updateSettingsDOM(window.RAMMachine.machine.settings);
  Nodes.settingsForm.addEventListener("input", () => {
    window.RAMMachine.machine.settings = MachineSettings.fromForm(new FormData(Nodes.settingsForm));
  });

  Nodes.resetSettingsButton.addEventListener("click", () => {
    const defaultSettings = new MachineSettings();
    window.RAMMachine.machine.settings = defaultSettings;
    updateSettingsDOM(defaultSettings);
  });
  Nodes.closeSettingsButton.addEventListener("click", () => {
    Dialogs.settings.close();
  });
}
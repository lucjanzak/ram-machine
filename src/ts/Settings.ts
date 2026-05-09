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


const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function updateSettingsDOM(settings: MachineSettings, animations: boolean) {
  select<HTMLInputElement>(Nodes.settingsForm, `#input-tape-underflow-${settings.inputTapeUnderflow}`).checked = true;
  select<HTMLInputElement>(Nodes.settingsForm, `#uninitialized-register-read-${settings.uninitializedRegisterRead}`).checked = true;
  select<HTMLInputElement>(Nodes.settingsForm, `#program-counter-out-of-bounds-${settings.programCounterOutOfBounds}`).checked = true;
  if (animations) {
    select<HTMLInputElement>(Nodes.settingsForm, `#animations-enable`).checked = true;
  } else {
    select<HTMLInputElement>(Nodes.settingsForm, `#animations-disable`).checked = true;
  }
}

export function updateDefaultSettingsDOM(defaultSettings: MachineSettings, animations: boolean) {
  select<HTMLInputElement>(Nodes.settingsForm, `#input-tape-underflow-${defaultSettings.inputTapeUnderflow}`).defaultChecked = true;
  select<HTMLInputElement>(Nodes.settingsForm, `#uninitialized-register-read-${defaultSettings.uninitializedRegisterRead}`).defaultChecked = true;
  select<HTMLInputElement>(Nodes.settingsForm, `#program-counter-out-of-bounds-${defaultSettings.programCounterOutOfBounds}`).defaultChecked = true;
  if (animations) {
    select<HTMLInputElement>(Nodes.settingsForm, `#animations-enable`).defaultChecked = true;
  } else {
    select<HTMLInputElement>(Nodes.settingsForm, `#animations-disable`).defaultChecked = true;
  }
}

let _animationsEnabled = false;
function changeAnimationEnabled(enabled: boolean) {
    _animationsEnabled = enabled;
    if (_animationsEnabled) {
      document.body.classList.add("animations-enabled");
      document.body.classList.add("monaco-enable-motion");
      document.body.classList.remove("animations-disabled");
      document.body.classList.remove("monaco-disable-motion");
    } else {
      document.body.classList.add("animations-disabled");
      document.body.classList.add("monaco-disable-motion");
      document.body.classList.remove("animations-enabled");
      document.body.classList.remove("monaco-enable-motion");
    }
    window.RAMMachine.chart.changeAnimationEnabled(enabled);
}

export function animationsEnabled() {
  return _animationsEnabled;
}

export function initSettingsDOM() {
  const defaultSettings = new MachineSettings();

  changeAnimationEnabled(!prefersReducedMotion);
  updateSettingsDOM(window.RAMMachine.machine.settings, animationsEnabled());
  updateDefaultSettingsDOM(defaultSettings, animationsEnabled());

  Nodes.settingsForm.addEventListener("input", () => {
    const formData = new FormData(Nodes.settingsForm);
    window.RAMMachine.machine.settings = MachineSettings.fromForm(formData);
    changeAnimationEnabled(formData.get("animations-toggle") === "enable");
  });

  Nodes.settingsForm.addEventListener("reset", () => {
    window.RAMMachine.machine.settings = defaultSettings;
    changeAnimationEnabled(!prefersReducedMotion);
    updateSettingsDOM(defaultSettings, animationsEnabled());
  });
  Nodes.settingsForm.addEventListener("submit", (e) => {
    Dialogs.settings.close();
    e.preventDefault();
  });
}
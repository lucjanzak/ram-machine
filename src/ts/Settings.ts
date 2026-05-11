import { Dialogs, Nodes, select } from "./Nodes";

export type InputTapeUnderflowBehavior = "error" | "zero" | "random";
export type UninitializedRegisterReadBehavior = "error" | "zero" | "random" | "superpositionCollapse";
export type ProgramCounterOutOfBoundsBehavior = "error" | "actAsHalt";

export class MachineSettings {
  inputTapeUnderflow: InputTapeUnderflowBehavior = "error";
  uninitializedRegisterRead: UninitializedRegisterReadBehavior = "zero";
  programCounterOutOfBounds: ProgramCounterOutOfBoundsBehavior = "error";

  static parseInputTapeUnderflowBehavior(input: FormDataEntryValue | string | null): InputTapeUnderflowBehavior | null {
    if (input === "error" || input === "zero" || input === "random") return input;
    return null;
  }

  static parseUninitializedRegisterReadBehavior(
    input: FormDataEntryValue | string | null
  ): UninitializedRegisterReadBehavior | null {
    if (input === "error" || input === "zero" || input === "random" || input === "superpositionCollapse") return input;
    return null;
  }

  static parseProgramCounterOutOfBoundsBehavior(
    input: FormDataEntryValue | string | null
  ): ProgramCounterOutOfBoundsBehavior | null {
    if (input === "error" || input === "actAsHalt") return input;
    return null;
  }

  static fromForm(formData: FormData): MachineSettings {
    return {
      inputTapeUnderflow:
        MachineSettings.parseInputTapeUnderflowBehavior(formData.get("input-tape-underflow-behavior")) || "error",
      uninitializedRegisterRead:
        MachineSettings.parseUninitializedRegisterReadBehavior(formData.get("uninitialized-register-read-behavior")) ||
        "error",
      programCounterOutOfBounds:
        MachineSettings.parseProgramCounterOutOfBoundsBehavior(
          formData.get("program-counter-out-of-bounds-behavior")
        ) || "error",
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

export class Preferences {
  // Placeholder values, defaults are in revertToDefaults();
  private animationsEnabled = false;
  private codeSnippetsEnabled = false;

  static loadOrNew() {
    const item = localStorage.getItem("RAMMachine.preferences");
    if (item === null) {
      return new Preferences();
    } else {
      return Preferences.loadFromJSON(item);
    }
  }

  static loadFromJSON(jsonText: string) {
    const preferences = new Preferences();
    const json = JSON.parse(jsonText);
    if (typeof json.animationsEnabled === "boolean") {
      preferences.setAnimationsEnabled(json.animationsEnabled);
    }
    if (typeof json.codeSnippetsEnabled === "boolean") {
      preferences.setCodeSnippetsEnabled(json.codeSnippetsEnabled);
    }
    return preferences;
  }

  saveToLocalStorage() {
    localStorage.setItem(
      "RAMMachine.preferences",
      JSON.stringify({
        animationsEnabled: this.animationsEnabled === !prefersReducedMotion ? undefined : this.animationsEnabled,
        codeSnippetsEnabled: this.codeSnippetsEnabled,
      })
    );
    console.trace("save", localStorage.getItem("RAMMachine.preferences"));
  }

  constructor() {
    this.revertToDefaults();
  }

  setFromForm(formData: FormData) {
    this.setAnimationsEnabled(formData.get("animations-toggle") === "enable");
    this.setCodeSnippetsEnabled(formData.get("monaco-editor-snippets-toggle") === "on");
    this.saveToLocalStorage();
  }

  revertToDefaults() {
    this.setAnimationsEnabled(!prefersReducedMotion);
    this.setCodeSnippetsEnabled(false);
  }

  setAnimationsEnabled(enabled: boolean) {
    this.animationsEnabled = enabled;
    if (this.animationsEnabled) {
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

    // This function may get called before window.RAMMachine is initialized
    if (window.RAMMachine !== undefined) {
      window.RAMMachine.chart.setAnimationsEnabled(enabled);
    }
  }

  getAnimationsEnabled() {
    return this.animationsEnabled;
  }

  setCodeSnippetsEnabled(enabled: boolean) {
    this.codeSnippetsEnabled = enabled;
  }

  getCodeSnippetsEnabled() {
    return this.codeSnippetsEnabled;
  }
}

export function updateSettingsDOM(settings: MachineSettings, preferences: Preferences) {
  select<HTMLInputElement>(Nodes.settingsForm, `#input-tape-underflow-${settings.inputTapeUnderflow}`).checked = true;
  select<HTMLInputElement>(
    Nodes.settingsForm,
    `#uninitialized-register-read-${settings.uninitializedRegisterRead}`
  ).checked = true;
  select<HTMLInputElement>(
    Nodes.settingsForm,
    `#program-counter-out-of-bounds-${settings.programCounterOutOfBounds}`
  ).checked = true;
  if (preferences.getAnimationsEnabled()) {
    select<HTMLInputElement>(Nodes.settingsForm, `#animations-enable`).checked = true;
  } else {
    select<HTMLInputElement>(Nodes.settingsForm, `#animations-disable`).checked = true;
  }
  select<HTMLInputElement>(Nodes.settingsForm, `#monaco-editor-snippets-checkbox`).checked =
    preferences.getCodeSnippetsEnabled();
}

export function updateDefaultSettingsDOM(defaultSettings: MachineSettings, defaultPreferences: Preferences) {
  select<HTMLInputElement>(
    Nodes.settingsForm,
    `#input-tape-underflow-${defaultSettings.inputTapeUnderflow}`
  ).defaultChecked = true;
  select<HTMLInputElement>(
    Nodes.settingsForm,
    `#uninitialized-register-read-${defaultSettings.uninitializedRegisterRead}`
  ).defaultChecked = true;
  select<HTMLInputElement>(
    Nodes.settingsForm,
    `#program-counter-out-of-bounds-${defaultSettings.programCounterOutOfBounds}`
  ).defaultChecked = true;
  if (preferences.getAnimationsEnabled()) {
    select<HTMLInputElement>(Nodes.settingsForm, `#animations-enable`).defaultChecked = true;
  } else {
    select<HTMLInputElement>(Nodes.settingsForm, `#animations-disable`).defaultChecked = true;
  }
  select<HTMLInputElement>(Nodes.settingsForm, `#monaco-editor-snippets-checkbox`).defaultChecked =
    preferences.getCodeSnippetsEnabled();
}

export const preferences = Preferences.loadOrNew();
export function initSettingsDOM() {
  const defaultSettings = new MachineSettings();
  const defaultPreferences = new Preferences();
  updateDefaultSettingsDOM(defaultSettings, defaultPreferences);

  updateSettingsDOM(window.RAMMachine.machine.settings, preferences);

  Nodes.settingsForm.addEventListener("input", () => {
    const formData = new FormData(Nodes.settingsForm);
    window.RAMMachine.machine.settings = MachineSettings.fromForm(formData);
    preferences.setFromForm(formData);
  });
  Nodes.settingsForm.addEventListener("reset", () => {
    window.RAMMachine.machine.settings = defaultSettings;
    preferences.revertToDefaults();
    preferences.saveToLocalStorage();
    updateSettingsDOM(defaultSettings, preferences);
  });
  Nodes.settingsForm.addEventListener("submit", (e) => {
    Dialogs.settings.close();
    e.preventDefault();
  });
}

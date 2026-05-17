import { EXAMPLE_PROGRAMS, EXAMPLE_PROGRAMS_ASSEMBLY } from "./Examples";
import { Machine } from "./Machine";
import { initDOM } from "./Nodes";
import { Program } from "./Program";
import { createEditor } from "./MonacoEditor";
import { t, translations } from "./Localization";
import { testingArea } from "./testing";
import * as monaco from "monaco-editor";
import "../css/index.module.css";
import { ComplexityChart, initChart } from "./Chart";
import { loadInitialHash } from "./URLCode";
import { preferences } from "./Settings";
import { initGlobalKeybinds } from "./Keybinds";

const machine = new Machine();
const editor = createEditor();

// Make these values globally available
declare global {
  interface Window {
    RAMMachine: {
      machine: Machine;
      editor: monaco.editor.IStandaloneCodeEditor;
      chart: ComplexityChart;
      EXAMPLE_PROGRAMS: { [K in keyof typeof EXAMPLE_PROGRAMS]: Program };
      EXAMPLE_PROGRAMS_ASSEMBLY: {
        [K in keyof typeof EXAMPLE_PROGRAMS_ASSEMBLY]: string;
      };
    };
    currentLanguage: keyof typeof translations;
    lang: {
      translations: typeof translations;
      currentTranslation: typeof t;
    };
  }
}

window.RAMMachine = {
  machine,
  editor,
  chart: initChart(),
  EXAMPLE_PROGRAMS: EXAMPLE_PROGRAMS,
  EXAMPLE_PROGRAMS_ASSEMBLY: EXAMPLE_PROGRAMS_ASSEMBLY,
};
window.lang = {
  translations,
  currentTranslation: t,
};

// Initialization
initDOM();
initGlobalKeybinds();
preferences.refreshPaneVisibility();
loadInitialHash();

// Testing
testingArea();

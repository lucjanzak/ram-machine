import { DEFAULT_PROGRAM_ASSEMBLY, EXAMPLE_PROGRAMS, EXAMPLE_PROGRAMS_ASSEMBLY } from "./Examples";
import { Machine } from "./Machine";
import { initDOM, Nodes, Templates, useTemplate } from "./Nodes";
import { Program } from "./Program";
import { createEditor } from "./MonacoEditor";

import * as monaco from "monaco-editor";

import "../css/index.module.css";
import { BigScrollList } from "./BigScrollList";
import { t, translations } from "./Localization";

const machine = new Machine();
const editor = createEditor();
function compileInput() {
  const assembly = editor.getValue();
  const program = Program.fromAssembly(assembly);
  machine.loadProgramAndReset(program);
}

// Make these values globally available
declare global {
  interface Window {
    RAMMachine: {
      machine: Machine;
      editor: monaco.editor.IStandaloneCodeEditor;
      EXAMPLE_PROGRAMS: { [K in keyof typeof EXAMPLE_PROGRAMS]: Program };
      EXAMPLE_PROGRAMS_ASSEMBLY: { [K in keyof typeof EXAMPLE_PROGRAMS_ASSEMBLY]: string };
      compileInput: () => void;
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
  EXAMPLE_PROGRAMS: EXAMPLE_PROGRAMS,
  EXAMPLE_PROGRAMS_ASSEMBLY: EXAMPLE_PROGRAMS_ASSEMBLY,
  compileInput,
};
window.lang = {
  translations,
  currentTranslation: t,
};

// Initialization
initDOM();
machine.loadAssemblyAndReset(DEFAULT_PROGRAM_ASSEMBLY);

/// Testing area
const bigScrollist = new BigScrollList(
  Nodes.bigScrollListTest,
  "horizontal",
  2000000n,
  90, // item size
  (index) => {
    const f = useTemplate(Templates.bigScrollListTestRow);
    f.querySelector("#number")!.textContent = `${index};`;
    return f;
  },
  800
);

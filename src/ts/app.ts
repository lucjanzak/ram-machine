import { DEFAULT_PROGRAM_ASSEMBLY, EXAMPLE_PROGRAMS, EXAMPLE_PROGRAMS_ASSEMBLY } from "./Examples";
import { Machine } from "./Machine";
import { Nodes, Templates, useTemplate } from "./Nodes";
import { Program } from "./Program";
import { createEditor } from "./MonacoEditor";

import * as monaco from "monaco-editor";

import "../css/main.module.css";
import { BigScrollList } from "./BigScrollList";
import { translations } from "./Localization";

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
  }
}
window.RAMMachine = {
  machine,
  editor,
  EXAMPLE_PROGRAMS: EXAMPLE_PROGRAMS,
  EXAMPLE_PROGRAMS_ASSEMBLY: EXAMPLE_PROGRAMS_ASSEMBLY,
  compileInput,
};

/// Initialization below:
machine.loadAssemblyAndReset(DEFAULT_PROGRAM_ASSEMBLY);

/// Testing
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

console.log(translations.en);

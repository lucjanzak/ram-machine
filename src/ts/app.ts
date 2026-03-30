import { examplePrograms, exampleProgramsAsm } from "./Examples";
import { Machine } from "./Machine";
import { Nodes } from "./Nodes";
import { Program } from "./Program";
import { createEditor } from "./MonacoEditor";

import * as monaco from "monaco-editor";

import "../main.module.css";

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
      examplePrograms: { [K in keyof typeof examplePrograms]: Program };
      exampleProgramsAsm: { [K in keyof typeof exampleProgramsAsm]: string };
      compileInput: () => void;
    };
  }
}
window.RAMMachine = {
  machine,
  editor,
  examplePrograms,
  exampleProgramsAsm,
  compileInput,
};

/// Initialization below:
machine.loadAssemblyAndReset(exampleProgramsAsm.SIMPLE_EXAMPLE);

export function updateDOM() {
  const listingRows = machine.program.createListingRows();
  console.log(machine, machine.program, listingRows);
  Nodes.programListing.textContent = "";
  Nodes.programListing.appendChild(listingRows);
}

updateDOM();
machine.stats.replaceStatisticsDOM();

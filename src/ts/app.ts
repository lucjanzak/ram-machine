import { DEFAULT_PROGRAM_ASSEMBLY, EXAMPLE_PROGRAMS, EXAMPLE_PROGRAMS_ASSEMBLY } from "./Examples";
import { Machine } from "./Machine";
import { Nodes, useTemplate } from "./Nodes";
import { Program } from "./Program";
import { createEditor } from "./MonacoEditor";

import * as monaco from "monaco-editor";

import "../css/main.module.css";
import { BigScrollList } from "./BigScrollList";

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

export function refreshListingWithAnimation() {
  const listingRows = machine.program.createListingRows();
  console.log(machine, machine.program, listingRows);
  Nodes.programListing.textContent = "";
  Nodes.programListing.appendChild(listingRows);
  Nodes.programListingTable.animate(
    [
      { opacity: 0, transform: "scale(0%) rotateX(90deg)" },
      { opacity: 1, transform: "scale(100%) rotateX(0deg)" },
    ],
    { duration: 500, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
  );
}

refreshListingWithAnimation();
machine.stats.replaceStatisticsDOM();

/// Testing
const bigScrollist = new BigScrollList(
  Nodes.bigScrollListTest,
  () => 200000n,
  () => 30,
  (index) => {
    const f = useTemplate(Nodes.bigScrollListTestRow);
    f.querySelector("#number")!.textContent = `${index};`;
    return f;
  },
  () => 400
);

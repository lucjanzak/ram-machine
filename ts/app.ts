import { ExamplePrograms } from "./Examples.js";
import { Machine } from "./Machine.js";
import { Nodes } from "./Nodes.js";
import { Program } from "./Program.js";

const machine = new Machine();
const examplePrograms = {
  NORMAL_EXAMPLE: ExamplePrograms.NORMAL_EXAMPLE,
  PARSING_ERROR_EXAMPLE: ExamplePrograms.PARSING_ERROR_EXAMPLE,
  PARSING_EXAMPLE: ExamplePrograms.PARSING_EXAMPLE,
};

// Make these values globally available
declare global {
  interface Window {
    RAMMachine: {
      machine: Machine;
      examplePrograms: { [K in keyof typeof examplePrograms]: Program };
    };
  }
}
window.RAMMachine = {
  machine,
  examplePrograms,
};

/// Initialization below:

machine.loadProgramAndReset(ExamplePrograms.NORMAL_EXAMPLE);

export function updateDOM() {
  const listingRows = machine.program.createListingRows();
  console.log(machine, machine.program, listingRows);
  Nodes.programListing.textContent = "";
  Nodes.programListing.appendChild(listingRows);
}

updateDOM();

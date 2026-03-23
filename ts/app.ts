import { ExamplePrograms } from "./Examples.js";
import { Machine } from "./Machine.js";
import { Nodes } from "./Nodes.js";

const machine = new Machine();
machine.loadProgramAndReset(ExamplePrograms.NORMAL_EXAMPLE);

function updateDOM() {
  const listingRows = machine.program.createListingRows();
  console.log(machine, machine.program, listingRows);
  Nodes.programListing.textContent = "";
  Nodes.programListing.appendChild(listingRows);
}

updateDOM();

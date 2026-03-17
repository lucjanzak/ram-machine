const machine = new Machine(Program.PARSING_EXAMPLE);

function updateDOM() {
  const listingRows = machine.program.createListingRows();
  console.log(machine, machine.program, listingRows);
  Nodes.programListing.textContent = "";
  Nodes.programListing.appendChild(useTemplate(Nodes.programListingHeader));
  Nodes.programListing.appendChild(listingRows);
}

updateDOM();

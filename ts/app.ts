const machine = new Machine();

function updateDOM() {
  const newDOM = machine.program.createDOM();
  console.log(machine, machine.program, newDOM);
  Nodes.programListing.textContent = "";
  Nodes.programListing.appendChild(newDOM);
}

updateDOM();

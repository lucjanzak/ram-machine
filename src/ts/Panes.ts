import { Nodes } from "./Nodes";

export type PaneName = "register" | "programListing" | "status" | "codeEditor";

function getPane(name: PaneName) {
  return Nodes.panes[name];
}
function getPaneButton(name: PaneName) {
  return Nodes.viewButtons[name];
}

export function changePaneVisibility(name: PaneName, state: boolean | undefined) {
  const pane = getPane(name);
  const button = getPaneButton(name);

  pane.classList.toggle("active", state);
  button.classList.toggle("active", state);
}

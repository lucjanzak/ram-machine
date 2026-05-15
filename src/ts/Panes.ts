import { Nodes } from "./Nodes";

export type PaneName = "register" | "programListing" | "status" | "codeEditor";

export function getPane(name: PaneName): Element | null {
  // This method can get called before Nodes is initialized
  if (Nodes === undefined) return null;
  return Nodes.panes[name];
}

export function getPaneButton(name: PaneName): Element | null {
  // This method can get called before Nodes is initialized
  if (Nodes === undefined) return null;
  return Nodes.viewButtons[name];
}

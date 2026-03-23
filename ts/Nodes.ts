import { unwrap } from "./Util.js";

export namespace Nodes {
  // Static elements
  export const programListing = unwrap(document.querySelector("#program-listing"));
  export const stats = unwrap(document.querySelector("#stats"));

  // Templates
  export const commentTile = unwrap(document.querySelector<HTMLTemplateElement>("#comment-tile"));
  export const instructionTile = unwrap(document.querySelector<HTMLTemplateElement>("#instruction-tile"));
  export const statsRow = unwrap(document.querySelector<HTMLTemplateElement>("#stats-row"));
}

export function useTemplate(instructionTile: HTMLTemplateElement) {
  return document.importNode(instructionTile.content, true);
}

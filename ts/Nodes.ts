import { unwrap } from "./Util.js";

export namespace Nodes {
  // Static elements
  export const programListing = unwrap(document.querySelector("#program-listing"));

  // Templates
  export const commentTile = unwrap(document.querySelector<HTMLTemplateElement>("#comment-tile"));
  export const instructionTile = unwrap(document.querySelector<HTMLTemplateElement>("#instruction-tile"));
}

export function useTemplate(instructionTile: HTMLTemplateElement) {
  return document.importNode(instructionTile.content, true);
}

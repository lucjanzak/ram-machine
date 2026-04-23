import { SparseArray } from "./BigArray";
import { unwrap } from "./Util";

export namespace Nodes {
  // Static elements
  export const inputTape = unwrap(document.querySelector("#input-tape"));
  export const registers = unwrap(document.querySelector("#registers"));
  export const programListingTable = unwrap(document.querySelector("#program-listing-table"));
  export const programListing = unwrap(document.querySelector("#program-listing"));
  export const outputTape = unwrap(document.querySelector("#input-tape"));
  export const stats = unwrap(document.querySelector("#stats"));
  export const bigScrollListTest = unwrap(document.querySelector<HTMLElement>("#big-scroll-list-test"));
  // export const programTextEditorBasic = unwrap(document.querySelector<HTMLTextAreaElement>("#program-text-editor-basic"));
  export const programTextEditorContainer = unwrap(document.querySelector<HTMLDivElement>("#program-text-editor-container"));

  // Templates
  export const commentTile = unwrap(document.querySelector<HTMLTemplateElement>("#comment-tile"));
  export const instructionTile = unwrap(document.querySelector<HTMLTemplateElement>("#instruction-tile"));
  export const statsRow = unwrap(document.querySelector<HTMLTemplateElement>("#stats-row"));
  export const registerRow = unwrap(document.querySelector<HTMLTemplateElement>("#register-row"));
  export const bigScrollListTestRow = unwrap(document.querySelector<HTMLTemplateElement>("#big-scroll-list-test-row"));

  // Reusable elements
  export const registerRows: SparseArray<DocumentFragment> = new SparseArray();
}

export function useTemplate(instructionTile: HTMLTemplateElement) {
  return document.importNode(instructionTile.content, true);
}

import { expect } from "./Util";

export namespace Nodes {
  function element<T extends Element = Element>(selector: string) {
    return expect(document.querySelector<T>(selector), `element with selector '${selector}' not found`);
  }

  // Static elements
  export const programListingTable = element("#program-listing-table");
  // export const programTextEditorBasic = element<HTMLTextAreaElement>("#program-text-editor-basic");
  export const programTextEditorContainer = element<HTMLElement>("#program-text-editor-container");
  export const programListing = element("#program-listing");
  export const stats = element("#stats");
  export const registerScrollList = element<HTMLElement>("#register-scroll-list");
  export const inputTape = element<HTMLElement>("#input-tape");
  export const outputTape = element<HTMLElement>("#output-tape");
  export const bigScrollListTest = element<HTMLElement>("#big-scroll-list-test");
}

export namespace Templates {
  function template(selector: string) {
    return expect(document.querySelector<HTMLTemplateElement>(`template${selector}`), `template with selector '${selector}' not found`);
  }

  export const commentTile = template("#comment-tile");
  export const instructionTile = template("#instruction-tile");
  export const statsRow = template("#stats-row");
  export const registerRow = template("#register-row");
  export const inputTapeCell = template("#input-tape-cell");
  export const outputTapeCell = template("#output-tape-cell");
  export const bigScrollListTestRow = template("#big-scroll-list-test-row");
}

export function useTemplate(instructionTile: HTMLTemplateElement) {
  return document.importNode(instructionTile.content, true);
}

export function select<T extends Element = Element>(f: ParentNode, selector: string) {
  return expect(f.querySelector<T>(selector), `element with selector '${selector}' not found in f: ${f}`);
}

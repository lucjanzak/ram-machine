function unwrap<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error(`unwrap of ${value}`);
  }
  return value;
}

namespace Nodes {
  // Static elements
  export const programListing = unwrap(document.querySelector("#program-listing"));

  // Templates
  export const programListingHeader = unwrap(document.querySelector<HTMLTemplateElement>("#program-listing-header"));
  export const commentTile = unwrap(document.querySelector<HTMLTemplateElement>("#comment-tile"));
  export const instructionTile = unwrap(document.querySelector<HTMLTemplateElement>("#instruction-tile"));
}

function useTemplate(instructionTile: HTMLTemplateElement) {
  return document.importNode(instructionTile.content, true);
}

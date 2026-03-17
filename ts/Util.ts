function unwrap<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error(`unwrap of ${value}`);
  }
  return value;
}

namespace Nodes {
  export const programListing = unwrap(document.querySelector("#program-listing"));
  export const instructionTile = unwrap(document.querySelector<HTMLTemplateElement>("#instruction-tile"));
}

function useTemplate(instructionTile: HTMLTemplateElement) {
  return document.importNode(instructionTile.content, true);
}

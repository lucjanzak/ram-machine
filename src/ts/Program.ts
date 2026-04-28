import { Instruction, instructionToString } from "./Instruction";
import { Nodes, select, Templates, useTemplate } from "./Nodes";
import { Parser } from "./Parser";

export type ParsedLine = {
  labels: string[];
  instruction: Instruction | null;
  comment: string | null;
};

// One parsed "line"/element of the source code
export type Tile =
  | {
      type: "instruction";
      labels: string[];
      instruction: Instruction;
      comment: string | null;
    }
  | {
      type: "comment";
      comment: string;
    };

// One parsed element of the source code, with a DOM element attached to it
export type TileDOM = Tile & { fragment: DocumentFragment };

// should always be a positive integer from 0 to programlength
export type ProgramCounter = number;

export class Program {
  static readonly EMPTY = new Program();

  private instructions: Instruction[] = [];
  private labels = new Map<string, ProgramCounter>();
  private tiles: Tile[] | TileDOM[] = [];

  getInstruction(index: ProgramCounter) {
    return this.instructions[index];
  }
  getLabelLocation(label: string) {
    return this.labels.get(label);
  }

  static createDOMTilesFromTiles(tiles: Tile[]): TileDOM[] {
    const tilesDOM: TileDOM[] = [];

    function makeLabelsText(labels: string[]): string {
      return labels.map((x) => x + ":").join("\n");
    }
    let lineNumber = 0;
    tiles.forEach((tile, _index) => {
      if (tile.type === "comment") {
        const t = useTemplate(Templates.commentTile);
        select(t, "#comment").textContent = tile.comment;
        tilesDOM.push(Object.assign(tile, { fragment: t }));
      } else if (tile.type === "instruction") {
        lineNumber++;
        const t = useTemplate(Templates.instructionTile);
        select(t, "#line-number").textContent = `${lineNumber}`;
        select(t, "#labels").textContent = makeLabelsText(tile.labels);
        select(t, "#instruction").textContent = instructionToString(tile.instruction);
        if (tile.comment !== null) {
          const comment = select(t, "#comment");
          comment.textContent = tile.comment;
          comment.classList.add("present");
        }
        tilesDOM.push(Object.assign(tile, { fragment: t }));
      }
    });

    return tilesDOM;
  }

  createListingDOMFragment(): DocumentFragment {
    const fragment = document.createDocumentFragment();
    for (const tile of Program.createDOMTilesFromTiles(this.tiles)) {
      fragment.append(tile.fragment);
    }
    return fragment;
  }

  refreshListingWithAnimation() {
    const listingRows = this.createListingDOMFragment();
    // console.log(window.RAMMachine.machine, this, listingRows);
    // console.log("Refreshing listing:", listingRows);
    Nodes.programListing.textContent = "";
    Nodes.programListing.appendChild(listingRows);
    Nodes.programListingTable.animate(
      [
        { opacity: 0, transform: "scale(0%) rotateX(90deg)" },
        { opacity: 1, transform: "scale(100%) rotateX(0deg)" },
      ],
      { duration: 500, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
    );
  }

  static fromAssembly(assemblyText: string, hideErrors = false): Program {
    const parser = new Parser(hideErrors);
    const tiles = parser.parseAssemblyProgram(assemblyText);
    // console.log("Program tiles:", tiles);
    return new Program(tiles);
  }

  constructor(tiles: Tile[] = []) {
    this.tiles = tiles;
    for (const tile of tiles) {
      if (tile.type === "instruction") {
        for (const label of tile.labels) {
          if (this.labels.has(label)) {
            // this is already checked earlier, while parsing - this is just to double check
            throw new Error(`label was already defined: '${label}'`);
          }
          this.labels.set(label, this.instructions.length);
        }
        this.instructions.push(tile.instruction);
      }
    }
  }
}

import { Instruction, instructionToString } from "./Instruction.js";
import { Nodes, useTemplate } from "./Nodes.js";
import { Parser } from "./Parser.js";
import { unwrap } from "./Util.js";

export type ParsedLine = {
  labels: string[];
  instruction: Instruction | null;
  comment: string | null;
};

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

export type TileDOM = Tile & { fragment: DocumentFragment };

export type ProgramCounter = number; // should always be a positive integer from 0(?) or from 1 to programlength
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
    for (const tile of tiles) {
      if (tile.type === "comment") {
        const t = useTemplate(Nodes.commentTile);
        unwrap(t.querySelector("#comment")).textContent = tile.comment;
        tilesDOM.push(Object.assign(tile, { fragment: t }));
      } else if (tile.type === "instruction") {
        const t = useTemplate(Nodes.instructionTile);
        unwrap(t.querySelector("#labels")).textContent = makeLabelsText(tile.labels);
        unwrap(t.querySelector("#instruction")).textContent = instructionToString(tile.instruction);
        if (tile.comment !== null) {
          const comment = unwrap(t.querySelector("#comment"));
          comment.textContent = tile.comment;
          comment.classList.add("present");
        }
        tilesDOM.push(Object.assign(tile, { fragment: t }));
      }
    }

    return tilesDOM;
  }

  createListingRows(): DocumentFragment {
    const fragment = document.createDocumentFragment();
    for (const tile of Program.createDOMTilesFromTiles(this.tiles)) {
      fragment.append(tile.fragment);
    }
    return fragment;
  }

  static fromAssembly(assemblyText: string, hideErrors = false): Program {
    const parser = new Parser(hideErrors);
    const tiles = parser.parseAssemblyProgram(assemblyText);
    console.log("Program tiles:", tiles);
    return new Program(tiles);
  }

  constructor(tiles: Tile[] = []) {
    this.tiles = tiles;
    for (const tile of tiles) {
      if (tile.type === "instruction") {
        for (const label of tile.labels) {
          if (this.labels.has(label)) {
            // this is already checked earlier - this is just to double check
            throw new Error(`label was already defined: '${label}'`);
          }
          this.labels.set(label, this.instructions.length);
        }
        this.instructions.push(tile.instruction);
      }
    }
  }
}

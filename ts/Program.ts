type ParsedLine = {
  labels: string[];
  instruction: Instruction | null;
  comment: string | null;
};

type Tile =
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

type ProgramCounter = number; // should always be a positive integer from 0(?) or from 1 to programlength
class Program {
  static readonly ParsingExample = Program.parseAssembly(`
    ; comment only
    label_only:
    label: ; with comment

    HALT 
    HALT ; with comment
    label_with: HALT
    label_with1: HALT ; comment

    READ 2 
    READ 2 ; with comment
    label_with2: READ 2
    label_with3: READ 2 ; and comment

    JUMP abc 
    JUMP abc ; with comment
    label_with4: JUMP abc
    label_with5: JUMP abc ; and comment

    LOAD =123 
    LOAD =123 ; with comment
    label_with6: LOAD =123
    label_with7: LOAD =123 ; and comment

    mul: ti : ple  :la :bels:
    labels with spaces:
    13: ; numeric label
    JUMP labels with spaces
    JUMP 13
`);
  static readonly ParsingErrorsExample = Program.parseAssembly(`
    a b c

    ; these should not work:
    HALT 1 ; halt with argument
    LOAD abc ; load with label
    STORE abc ; store to label
    LOAD ; load with no operand
    STORE; store with no operand
    STORE =3 ; store to immediate operand

    empty label:: ; this should report an error

    ; this should report an error:
    label_at_the_end:
`);
  static readonly NormalExample = Program.parseAssembly(`
start:
LOAD =0
WRITE 0
JUMP start
`);

  private instructions: Instruction[] = [];
  private labels = new Map<string, ProgramCounter>();
  private tiles: Tile[] = [];

  getInstruction(index: ProgramCounter) {
    return this.instructions[index];
  }
  getLabelLocation(label: string) {
    return this.labels.get(label);
  }

  createDOM(): HTMLDivElement {
    const list = document.createElement("div");
    for (const tile of this.tiles) {
      if (tile.type === "comment") {
        // TODO
        list.append(useTemplate(Nodes.instructionTile));
      } else if (tile.type === "instruction") {
        const t = useTemplate(Nodes.instructionTile);
        unwrap(t.querySelector("#labels")).textContent = tile.labels.join();
        unwrap(t.querySelector("#instruction")).textContent = tile.instruction.operation;
        unwrap(t.querySelector("#comment")).textContent = tile.comment;
        list.append();
      }
    }
    return list;
  }

  static parseAssembly(assemblyText: string): Program {
    const lines = assemblyText.split("\n");
    const tiles: Tile[] = [];

    const definedLabels = new Map<string, number>();
    function defineNewLabel(label: string, sourceLineNumber: number) {
      if (definedLabels.has(label)) {
        const originalLine = definedLabels.get(label);
        throw new Error(`label was already defined at line ${originalLine}: '${label}'`);
      }
      definedLabels.set(label, sourceLineNumber);
    }

    let leftoverCommentLines: string[] = [];
    let leftoverLabels: string[] = [];

    function processLine(line: string, lineIndex: number) {
      // console.log(`Processing line #${lineIndex + 1}: '${line}'`);
      const parsed = Parser.parseAssemblyLine(line);
      // console.log("Parsed line: ", parsed);

      parsed.labels.forEach((label) => defineNewLabel(label, lineIndex + 1));
      leftoverLabels = leftoverLabels.concat(parsed.labels);

      if (parsed.instruction !== null) {
        // push new comment tile if there were leftover comment lines
        if (leftoverCommentLines.length > 0) {
          tiles.push({
            type: "comment",
            comment: leftoverCommentLines.join("\n"),
          });
          leftoverCommentLines = [];
        }

        // push new instruction tile
        tiles.push({
          type: "instruction",
          comment: parsed.comment,
          instruction: parsed.instruction,
          labels: leftoverLabels,
        });
        leftoverLabels = [];
      } else {
        if (parsed.comment !== null) {
          leftoverCommentLines.push(parsed.comment);
        }
      }
    }

    lines.forEach((line, lineIndex) => {
      try {
        processLine(line, lineIndex);
      } catch (e) {
        console.warn(`Error while parsing line #${lineIndex + 1}:`, e);
      }
    });

    // push new comment tile if there were leftover comment lines
    if (leftoverCommentLines.length > 0) {
      tiles.push({
        type: "comment",
        comment: leftoverCommentLines.join("\n"),
      });
    }

    console.log("Program tiles:", tiles);
    return new Program(tiles);
  }

  constructor(tiles: Tile[]) {
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

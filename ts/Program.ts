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
  static readonly ParsingExample = Program.fromAssembly(`
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
  static readonly ParsingErrorsExample = Program.fromAssembly(`
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
`, true);
  static readonly NormalExample = Program.fromAssembly(`
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

  static fromAssembly(assemblyText: string, hideErrors = false): Program {
    const parser = new Parser(hideErrors);
    const tiles = parser.parseAssemblyProgram(assemblyText);
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

import { t } from "./Localization";
import { Dialogs, Nodes } from "./Nodes";
import { Program } from "./Program";
import { assertEq } from "./Util";

// r₀ r₁ r₂ r₃ r₄ r₅ r₆ r₇ r₈ r₉

const hdiv = "==============================";
function rightpad(text: string, n: number, c: string = " ") {
  while (text.length < n) {
    text = text + c;
  }
  return text;
}
const add = t.examples.ADDITION;
const abs = t.examples.ABSOLUTE_VALUE;
const ntn = t.examples.N_TO_THE_N;
const fac = t.examples.FACTORIAL;
const sum = t.examples.SUM;
const rev = t.examples.REVERSE_ARRAY;
const str = t.examples.STRESS_TEST;

export const EXAMPLE_PROGRAMS_ASSEMBLY = {
  ADDITION: `; ${add.title}
; ${hdiv}
;
; ${add.description[0]}
;
; ${add.description[1]}
READ 0  ; ${add.comments[0]}
READ 1  ; ${add.comments[1]}
ADD 1   ; ${add.comments[2]}
WRITE 0 ; ${add.comments[3]}
HALT    ; ${add.comments[4]}
`,
  ABSOLUTE_VALUE: `; ${abs.title}
; ${hdiv}
;
; ${abs.description}
READ 0        ; ${abs.comments[0]}
JGTZ ${rightpad(abs.labels.print, 8)} ; ${abs.comments[1]}
STORE 1       ; ${abs.comments[2]}
LOAD =0
SUB 1         ; ${abs.comments[3]}
${abs.labels.print}:
WRITE 0       ; ${abs.comments[4]}
HALT
`,
  N_TO_THE_N: `; ${ntn.title}
; ${hdiv}
; ${ntn.description}

READ 1 ; ${ntn.comments[0]}
LOAD 1
JGTZ ${ntn.labels.positive}

; ${ntn.comments[1]}
WRITE =0
HALT

; ${ntn.comments[2]}
${ntn.labels.positive}:
LOAD 1
STORE 2 ; ${ntn.comments[3]}
SUB =1
STORE 3 ; ${ntn.comments[4]}

${ntn.labels.loop}:
LOAD 3 ; ${ntn.comments[5]}
JGTZ ${ntn.labels.loop_continue}
JUMP ${ntn.labels.loop_end}

${ntn.labels.loop_continue}:
LOAD 2
MULT 1
STORE 2
LOAD 3
SUB =1
STORE 3
JUMP ${ntn.labels.loop}

${ntn.labels.loop_end}:
WRITE 2  ; ${ntn.comments[6]}
HALT
`,
  FACTORIAL: `; ${fac.title}
READ 1 ; ${fac.comments[0]}

LOAD =1 
STORE 2 ; ${fac.comments[1]}

; ${fac.comments[2]}
${fac.labels.loop}:
LOAD 1
JZERO ${fac.labels.loop_end}

MULT 2 ; ${fac.comments[3]}
STORE 2

LOAD 1
SUB =1  ; ${fac.comments[4]}
STORE 1

JUMP ${fac.labels.loop}

${fac.labels.loop_end}:
WRITE 2
HALT
`,
  SUM: `; ${sum.title}
; ${hdiv}
; ${sum.description}
;.SET INPUT_TAPE_UNDERFLOW zero

LOAD =0 ; ${sum.comments[0]}
STORE 1

; ${sum.comments[1]}
${sum.labels.loop}:
READ 0
JZERO ${sum.labels.loop_end} ; ${sum.comments[2]}

; ${sum.comments[3]}
ADD 1
STORE 1
JUMP ${sum.labels.loop}

; ${sum.comments[4]}
${sum.labels.loop_end}:
WRITE 1
HALT
`,
  REVERSE_ARRAY: `; ${rev.title}
; ${hdiv}
; r₁ - ${rev.registers.r1}
; r₂ - ${rev.registers.r2}
; r₃ - ${rev.registers.r3}
; r₄... - ${rev.registers.r4}

READ 0
STORE 1
STORE 2

; ${rev.comments[0]}
LOAD =4
STORE 3

; ${rev.comments[1]}
${rev.labels.read_array_loop_check}:
LOAD 2
JGTZ ${rev.labels.read_next_element}
JUMP ${rev.labels.read_array_end}

; ${rev.comments[2]}
${rev.labels.read_next_element}:
READ *3

; ${rev.comments[3]}
LOAD 3
ADD =1
STORE 3

; ${rev.comments[4]}
LOAD 2
SUB =1
STORE 2

JGTZ ${rev.labels.read_array_loop_check}

${rev.labels.read_array_end}:

; ${rev.comments[5]}
;
; ${rev.comments[6]}
${rev.labels.write_array_loop_check}:
LOAD 3
SUB =4
JGTZ ${rev.labels.write_loop}
JUMP end

; ${rev.comments[7]}
${rev.labels.write_loop}:
LOAD 3
SUB =1
STORE 3

; ${rev.comments[8]}
WRITE *3

JUMP ${rev.labels.write_array_loop_check}

end:
HALT
`,
  STRESS_TEST: `; ${str.title}
; ${hdiv}
;
; ${str.description}
;.SET INPUT_TAPE_UNDERFLOW zero
${str.labels.start}:
READ 0
WRITE 0
JUMP ${str.labels.start}
`,
  PARSER_TEST: `; Parser test example program
; ${hdiv}
;
; This example program contains many various combinations of labels, instructions, and comments.
;
;


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
labels with spaces: ; labels with spaces are technically supported, but not recommended due to potential confusion
13: ; numeric labels are technically supported, but not recommended due to potential confusion
JUMP labels with spaces
JUMP 13


HALT
JUMP a ; <-- this highlighting was bugged, but is fixed now
`,
  PARSER_ERROR_TEST: `; Parser errors example program
; ${hdiv}
;
; This example program contains many invalid combinations of labels, instructions, and comments.
;
;

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
`,
};

export const EXAMPLE_PROGRAMS: { [K in keyof typeof EXAMPLE_PROGRAMS_ASSEMBLY]: Program } = compileExamplePrograms();

function compileExamplePrograms(): { [K in keyof typeof EXAMPLE_PROGRAMS_ASSEMBLY]: Program } {
  const programs: any = {};
  const entries = Object.entries(EXAMPLE_PROGRAMS_ASSEMBLY);
  const total = entries.length;

  entries.forEach(([key, sourceCode], i) => {
    console.log(`Compiling example programs... (${i + 1}/${total}) ${key}`);
    if (key === "PARSER_ERROR_TEST") {
      const { program, compilerMessages } = Program.fromAssembly(sourceCode);
      assertEq(compilerMessages.length, 8);
      // console.log(compilerMessages);
      programs[key] = program;
    } else {
      const { program } = Program.fromAssembly(sourceCode);
      programs[key] = program;
    }
  });

  console.log("Compiling example programs done");
  return programs as { [K in keyof typeof EXAMPLE_PROGRAMS_ASSEMBLY]: Program };
}

export const DEFAULT_PROGRAM_ASSEMBLY = EXAMPLE_PROGRAMS_ASSEMBLY.ADDITION;

function initDOM() {
  const hidden = ["PARSER_TEST", "PARSER_ERROR_TEST"];
  for (const [programKey, programText] of Object.entries(EXAMPLE_PROGRAMS_ASSEMBLY)) {
    if (hidden.includes(programKey)) continue;

    const btn = document.createElement("button");
    btn.classList.add("nav-button");
    btn.classList.add("nav-button-auto");
    btn.addEventListener("click", () => {
      window.RAMMachine.machine.loadAssemblyAndReset(programText);
      Dialogs.loadFile.close();
    });

    const exampleTranslations: { [key: string]: { title: string } } = t.examples;
    if (programKey in exampleTranslations) {
      const title = exampleTranslations[programKey].title;
      btn.textContent = `${title}`;
    } else {
      btn.textContent = `${programKey}`;
    }
    Nodes.loadProgramButtons.appendChild(btn);
  }
}
initDOM();

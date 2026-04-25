import { t } from "./Localization";
import { Nodes } from "./Nodes";
import { Program } from "./Program";

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
const rev = t.examples.REVERSE_ARRAY;

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
  BENCHMARK_TEST: `; Benchmark program
; ${hdiv}
;
; A tight loop that copies values from the input tape to the output tape.
start:
READ 0
WRITE 0
JUMP start
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
      // TODO: instead of silencing warning, the warnings should be recorded and counted, and the count should be asserted
      programs[key] = Program.fromAssembly(sourceCode, true);
    } else {
      programs[key] = Program.fromAssembly(sourceCode);
    }
  });

  console.log("Compiling example programs done");
  return programs as { [K in keyof typeof EXAMPLE_PROGRAMS_ASSEMBLY]: Program };
}

export const DEFAULT_PROGRAM_ASSEMBLY = EXAMPLE_PROGRAMS_ASSEMBLY.ADDITION;

function initDOM() {
  const hidden = ["BENCHMARK_TEST", "PARSER_TEST", "PARSER_ERROR_TEST"];
  for (const [programKey, programText] of Object.entries(EXAMPLE_PROGRAMS_ASSEMBLY)) {
    if (hidden.includes(programKey)) continue;
    const btn = document.createElement("button");
    btn.classList.add("nav-button");
    btn.classList.add("nav-button-auto");
    btn.addEventListener("click", () => {
      window.RAMMachine.machine.loadAssemblyAndReset(programText);
    });
    const title: string = (t.examples as any)[programKey].title || programKey;
    btn.textContent = `${t.nav.load} '${title}'`;
    Nodes.loadProgramButtons.appendChild(btn);
  }
}
initDOM();

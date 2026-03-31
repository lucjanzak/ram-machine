import { Program } from "./Program";

// r₀ r₁ r₂ r₃ r₄ r₅ r₆ r₇ r₈ r₉

export const EXAMPLE_PROGRAMS_ASSEMBLY = {
  PARSING_EXAMPLE: `; Parser test example program
; =======================
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
  PARSING_ERROR_EXAMPLE: `; Parser errors example program
; =======================
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
  BENCHMARK_EXAMPLE: `; Benchmark program
; =======================
;
; A tight loop that copies values from the input tape to the output tape.
start:
READ 0
WRITE 0
JUMP start
`,
  SIMPLE_EXAMPLE: `; Simple example program
; =======================
;
; This is an example program
; that sums two numbers together.
;
; You can compile it using the button below,
; and then use the "Run" button at the top of the page
; to execute the program.
READ 0  ; Load the first value from the input tape to r0
READ 1  ; Load the second value from the input tape to r1
ADD 1   ; Add the value from r1 to r0, and store the result to r0 
WRITE 0 ; Write the contents of r0 to the output tape
HALT    ; End program execution
`,
};

export const EXAMPLE_PROGRAMS: { [K in keyof typeof EXAMPLE_PROGRAMS_ASSEMBLY]: Program } = compileExamplePrograms();

function compileExamplePrograms(): { [K in keyof typeof EXAMPLE_PROGRAMS_ASSEMBLY]: Program } {
  const programs: any = {};
  const entries = Object.entries(EXAMPLE_PROGRAMS_ASSEMBLY);
  const total = entries.length;

  entries.forEach(([key, sourceCode], i) => {
    console.log(`Compiling example programs... (${i + 1}/${total}) ${key}`);
    if (key === "PARSING_ERROR_EXAMPLE") {
      programs[key] = Program.fromAssembly(sourceCode, true);
    } else {
      programs[key] = Program.fromAssembly(sourceCode);
    }
  });

  console.log("Compiling example programs done");
  return programs as { [K in keyof typeof EXAMPLE_PROGRAMS_ASSEMBLY]: Program };
}

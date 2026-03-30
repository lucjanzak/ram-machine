import { Program } from "./Program";

// class Program;

export const exampleProgramsAsm = {
  PARSING_EXAMPLE: `; Parser test example
; =======================
; This example program contains many various combinations of labels, instructions, and comments
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
  PARSING_ERROR_EXAMPLE: `
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
  BENCHMARK_EXAMPLE: `
start:
LOAD =0
WRITE 0
JUMP start
`,
  SIMPLE_EXAMPLE: `; EXAMPLE
; ===========
;
; This is an example program
; that sums two numbers together
;
; You can compile it using the button below,
; and then use the "Run" button at the top of the page
; to execute the program
READ 0  ; Load the first value from the input tape to r0
READ 1  ; Load the second value from the input tape to r1
ADD 1   ; Add the value from r1 to r0, and store the result to r0 
WRITE 0 ; Write the contents of r0 to the output tape
HALT    ; End program execution
`,
};

export const examplePrograms = {
  PARSING_EXAMPLE: Program.fromAssembly(exampleProgramsAsm.PARSING_EXAMPLE),
  PARSING_ERROR_EXAMPLE: Program.fromAssembly(exampleProgramsAsm.PARSING_ERROR_EXAMPLE, true),
  BENCHMARK_EXAMPLE: Program.fromAssembly(exampleProgramsAsm.BENCHMARK_EXAMPLE),
  SIMPLE_EXAMPLE: Program.fromAssembly(exampleProgramsAsm.SIMPLE_EXAMPLE),
};

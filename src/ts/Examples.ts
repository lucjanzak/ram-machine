import { Program } from "./Program";

// class Program;
export namespace ExamplePrograms {
  export const PARSING_EXAMPLE = Program.fromAssembly(`
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
  export const PARSING_ERROR_EXAMPLE = Program.fromAssembly(
    `
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
    true
  );
  export const NORMAL_EXAMPLE = Program.fromAssembly(`
start:
LOAD =0
WRITE 0
JUMP start
`);
}

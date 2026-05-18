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
  FIBONACCI_ITERATIVE: `; Fibonacci sequence (iterative implementation)
; ${hdiv}
; r₁ - previous value
; r₂ - pre-previous value
; r₃ - current value
; r₄ - loop counter


LOAD =1 ; Initialize registers:
STORE 1 ; r₁ := 1
STORE 2 ; r₂ := 1

READ 4  ; r₄ := n (value from tape)
LOAD 4
SUB =2 
STORE 4 ; r₄ := r₄ - 2
JGTZ loop

; n ≤ 2 -- write out 1 and stop execution
return_one:
WRITE =1
HALT

; Main loop
loop:
; r₃ := r₂ + r₁
LOAD 2
ADD 1
STORE 3  

; r₁ := r₂
LOAD 2
STORE 1  

; r₂ := r₃
LOAD 3
STORE 2

; r₄ := r₄ - 1;
LOAD 4
SUB =1
STORE 4

; if r₄ > 0, repeat the loop
JGTZ loop

; Write out the iterative result
loop_end:
WRITE 3
HALT
`,
  FIBONACCI_RECURSIVE: `; Fibonacci sequence (recursive implementation)
; ${hdiv}
;
; Call stack layout:
;
; To call a function, write to r10-r99, and the function
; must immediately push the items onto the stack in the following order:
; [return address]  (from r10)
; [local9]
; [local8]
; [local7]
; [local6]
; [local5]
; [arg4...]         (from r15)
; [arg3]            (from r14)
; [arg2]            (from r13)
; [arg1]            (from r12)
; [arg0]            (from r11)
;
; In the function, the arguments may be fetched by using:
; \`\`\`
; LOAD *110
; SUB =n
; LOAD *0
; \`\`\`
; where n is the arg number. The arguments may be modified by using:
; \`\`\`
; LOAD *110
; SUB =n
; STORE 1
; LOAD =value
; STORE *1
; \`\`\`
;
; When returning, the function must pull all args/decrement the stack pointer,
; such that only the return address is left on the stack, and then call rts.

__init:
; Initialize everything
; ${hdiv}
; r0         : main procedure argument
; r1-r9      : scratch memory
; r10-r99    : procedure arguments / r10 = common return value
; r100-r199  : globals segment
; r200-r...  : dynamic allocation
;
; Initialize allocator
; ${hdiv}
; r100  : dynalloc_next_free_position
LOAD =200
STORE 100   ; dynalloc_next_free_position = 200

; Initialize stack
; ${hdiv}
; r110                        : pointer to stack structure
; [r110]                      : stack pointer
; [r110+1]                    : capacity
; [r110+2]..[[r110]]          : stack contents
; [r110+2]..[r110+2+[r110+1]] : stack reserved space
; ${hdiv}
; Allocate 250 cells for the stack
LOAD =250
STORE 2     ; r2 = STACK_SIZE
LOAD 100
STORE 110   ; stack = dynalloc_next_free_position;
ADD 2
ADD =2
STORE 100   ; dynalloc_next_free_position += STACK_SIZE + 2;

; Initialize stack pointer and capacity
LOAD 110
STORE 1     ; r1 = stack->top; // [stack + 0]
ADD =2
STORE *1    ; stack->top = (stack + 2);

LOAD 110
ADD =1
STORE 1     ; r1 = stack->capacity; // [stack + 1]
LOAD 2
STORE *1    ; stack->capacity = STACK_SIZE;
JUMP entry_point



; ===== PROCEDURE jump_to_fn =====
; Arguments:
; r0 : target_block_id
;
; Scratch:
; r1 : __local__target_block_id
jump_to_fn:
STORE 1
JGTZ __jump_to_fn__blocks

; Built-in functions
ADD =1
JZERO dynalloc_allocate_cells ; BLOCK -1

JUMP __jump_to_fn__no_function_found

; User functions
__jump_to_fn__blocks:
SUB =1000
JZERO block_1000
SUB =1
JZERO block_1001
SUB =1
JZERO block_1002
SUB =1
JZERO block_1003
SUB =1
JZERO block_1004
SUB =1
JZERO block_1005
SUB =1
JZERO block_1006
SUB =1
JZERO block_1007
SUB =1
JZERO block_1008
SUB =1
JZERO block_1009
SUB =1
JZERO block_1010
JUMP __jump_to_fn__no_function_found

__jump_to_fn__no_function_found:
; Function/block with ID contained in r1 was not found
WRITE =99999
WRITE 1
JUMP kill



; ===== PROCEDURE rts =====
; Arguments:
; (none)
;
; Scratch:
; r1 : __local__stack_pos
rts:
LOAD *110
SUB =1
STORE *110   ; stack->top = stack->top - 1; // Decrement stack pointer

LOAD *110
STORE 1      ; __local__stack_pos = stack->top;
LOAD *1      ; r0 = *__local__stack_pos;
JUMP jump_to_fn



; ===== FUNCTION fibonacci(n) =====
; fib(n) = fib(n - 1) + fib(n - 2)
;
; Arguments:
; r10 [ret]
; r11 [arg1] : n // Value of n
;
; Locals:
; [local2] : sum
;
; Scratch:
; r1 : __local__stack_top
; r2 : __local__var
;
; Returns:
; r10 : result // Value of fibonacci(n)
fn_fibonacci:
; --- PRELUDE BEGIN ---
LOAD *110
STORE 1     ; __local__stack_top = stack->top;

LOAD 10
STORE *1    ; *__local__stack_top = r10; // Push [ret]
LOAD 1
ADD =1
STORE 1     ; __local__stack_top++;

ADD =1      ; Local variable count: 1 
STORE 1     ; __local__stack_top += 1;

LOAD 11
STORE *1    ; *__local__stack_top = r11; // Push [arg0] : n
LOAD 1
ADD =1
STORE 1     ; __local__stack_top++;

STORE *110  ; stack->top = __local__stack_top;
; --- PRELUDE END ---

LOAD *110
SUB =1
LOAD *0     ; Read [arg0] n
SUB =1
STORE 11    ; r11 = n - 1;

; if (n <= 2) return 1;
SUB =1
JGTZ fibonacci_recursive
JUMP fibonacci_return_1
fibonacci_recursive:

; else
LOAD =1001
STORE 10    ; ret = 1001
JUMP fn_fibonacci
block_1001:
LOAD 10
STORE 2     ; r2 = fib(n - 1);

LOAD *110
SUB =2
STORE 1
LOAD 2
STORE *1    ; sum = fib(n - 1);


LOAD *110
SUB =1
LOAD *0     ; Read [arg0] n
SUB =2
STORE 11    ; r11 = n - 2;

LOAD =1002
STORE 10    ; ret = 1002
JUMP fn_fibonacci
block_1002:
LOAD 10
STORE 2     ; r2 = fib(n - 2);

LOAD *110
SUB =2
STORE 1
LOAD *1
ADD 2
STORE 10    ; return sum + fib(n - 2);
JUMP __fn_fibonacci__encore

fibonacci_return_1:
LOAD =1
STORE 10   ; return 1;

; --- ENCORE BEGIN ---
__fn_fibonacci__encore:
LOAD *110
SUB =2      ; Local variable count + argument count = 4
STORE *110  ; __local__stack_top = stack->top;
JUMP rts
; --- ENCORE END ---





entry_point:
READ 0 
STORE 11          ; r11 = n; // value from input tape
LOAD =1003
STORE 10          ; r10 = block_1003; // return address
JUMP fn_fibonacci
block_1003:
WRITE 10          ; r10 = fib(n); // return value
HALT



kill:
DIV =0
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

a b c ; Issue #1 unrecognizedMnemonic

HALT 1     ; halt with argument          ; Issue #2 <unexpectedOperand>
LOAD abc   ; load with label             ; Issue #3 <bigintParseError>
STORE abc  ; store to label              ; Issue #4 <bigintParseError>
LOAD       ; load with no operand        ; Issue #5 <bigintExpected>
STORE      ; store with no operand       ; Issue #6 <bigintExpected>
STORE =3   ; store to immediate operand  ; Issue #7 <immediateWritableOperand>
JUMP       ; jump with no label          ; Issue #8 <labelExpected>
STORE -1   ; store to negative register  ; Issue #9 <negativeRegister>

empty label::  ; Issue #10 <emptyLabel>

a:
a:  ; Issue #11 <redefinedLabel>

invalid-label-name:  ; Issue #12 <invalidLabel>
HALT

; these should report a warning:
; Issue #13 <expectedDirective>
;.
; Issue #14 <unknownDirective>
;.S
; Issue #15 <expectedArguments>
;.SET
; Issue #16 <setInvalidKey>
;.SET ABC
; Issue #17 <setMissingValue>
;.SET INPUT_TAPE_UNDERFLOW
; Issue #18 <setInvalidValue>
;.SET INPUT_TAPE_UNDERFLOW asd

; this should report a warning:
label_at_the_end:  ; Issue #19 <labelAtTheEnd>
`,
};
//window.RAMMachine.machine.loadAssemblyAndReset(window.RAMMachine.EXAMPLE_PROGRAMS_ASSEMBLY.PARSER_ERROR_TEST)

export const EXAMPLE_PROGRAMS: { [K in keyof typeof EXAMPLE_PROGRAMS_ASSEMBLY]: Program } = compileExamplePrograms();

function compileExamplePrograms(): { [K in keyof typeof EXAMPLE_PROGRAMS_ASSEMBLY]: Program } {
  const programs: any = {};
  const entries = Object.entries(EXAMPLE_PROGRAMS_ASSEMBLY);
  const total = entries.length;

  entries.forEach(([key, sourceCode], i) => {
    console.log(`Compiling example programs... (${i + 1}/${total}) ${key}`);
    if (key === "PARSER_ERROR_TEST") {
      const { program, compilerMessages } = Program.fromAssembly(sourceCode);
      assertEq(compilerMessages.length, 19);
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

# RAM machine emulator

RAM machine (Random-Access Machine / RA-Machine) emulator made with TypeScript.

### [Open the RAM machine emulator in your browser](https://lucjanzak.github.io/ram-machine/)

# The RAM machine

Below is a short description of the RAM machine.

## Architecture

The RAM machine is an abstract mathematical model used for calculating computational complexity of computer algorithms.

A RAM machine consists of several components:

- Input Tape
- Output Tape
- Registers

The input tape is an arbitrarily long list of cells, each cell containing one integer. This tape contains the input data for the program. The input tape cannot be read in a random order; only one cell can be read at a time, in order. The act of reading from the input tape also advances the tape, such that the next read from the tape will result in a new value.

The output tape is an arbitrarily long list of cells, starting out empty. This tape will contain the output of the program when the program finishes. Each cell may contain one integer. The output tape cannot be written to in a random order; only one cell can be written at a time, in order. The act of writing to the output tape also advances the tape, such that the next write to the tape will write a new value in the next cell over.

Registers are small memory cells that can each hold one integer. Registers can be reaad and written to arbitrarily, and they are usually used to hold multiple values for internal program calculations. The first register, called r₀, is called the accumulator, and is often used for atomic calculations and small tasks. Instructions often statically read from or write to r₀, without an option to change the target register.

In the RAM machine, all memory cells (in the registers and on the tape) can contain one arbitrarily large integer.

## Assembly language

### Instructions

The RAM machine has 12 different simple instructions that can be used to create programs.

| Mnemonic |         | Description                   | C-like equivalent          |
| -------- | ------- | ----------------------------- | -------------------------- |
| LOAD     | operand | Load a value into r₀          | `r₀ = op;`                 |
| STORE    | operand | Store a value from r₀         | `op = r₀;`                 |
| ADD      | operand | Increment r₀ by a value       | `r₀ += op;`                |
| SUB      | operand | Decrement r₀ by a value       | `r₀ -= op;`                |
| MUL      | operand | Multiply r₀ by a value        | `r₀ *= op;`                |
| DIV      | operand | Divide r₀ by a value          | `r₀ /= op;`                |
| READ     | operand | Read from the tape            | `op = input();`            |
| WRITE    | operand | Write to the tape             | `output(op);`              |
| JUMP     | label   | Unconditional jump            | `goto label;`              |
| JGTZ     | label   | Jump only if r₀ > 0           | `if (r₀ > 0) goto label;`  |
| JZERO    | label   | Jump only if r₀ is equal to 0 | `if (r₀ == 0) goto label;` |
| HALT     |         | Stop program execution        | `exit();`                  |

### Operands

There are three types of operands:
| Operand | Description |
| ------- | ----------------------------------------------------------------------------------------------------- |
| `=i` | literal, a whole number |
| `i` | contents of the register _i_ |
| `*i` | indirect addressing - contents of the register numbered with the number contained in the register _i_ |

Example:

```
LOAD =4
STORE 2
LOAD =7
STORE 4

WRITE =2 ; Writes the number 2 to the tape
WRITE 2  ; Writes the number 4 to the tape (the contents of the register r₂)
WRITE *2 ; Writes the number 7 to the tape (the contents of the register r₄)
```

Some operand types are incompatible with certain instructions. For example, you cannot store values to literals; therefore, the `READ` and `STORE` instructions cannot take literal operands.

```
READ =0 ; Invalid instruction - cannot read from tape to a literal value.
```

### Labels

Labels are arbitrary names for specific lines of code. You can define a label by typing a name followed by a colon (`:`) symbol.

Example:

```
LOAD =0
infinite_loop:
WRITE 0
JUMP infinite_loop
```

### Comments

Comments are additional pieces of text that do not affect the running of the program. These are typically used to explain a complicated piece of code, or broadly describe an algorithm. In RAM machine assembly, line comments start with a semicolon `;`, and stop at the end of the line. For simplicity, there are no block comments.

```
LOAD =99
; This is a comment
WRITE 0
```

# Building the project

1. Download the repository.
2. Run the commands below:

```
npm i
npm run start
```

3. Your browser should open with the program running.

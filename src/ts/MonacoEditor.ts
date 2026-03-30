import * as monaco from "monaco-editor";
import { Nodes } from "./Nodes";

function ramMachineAssemblyMonarchLanguage(): monaco.languages.IMonarchLanguage {
  return {
    ignoreCase: true,
    defaultToken: "",
    tokenPostfix: ".ram",

    readop_keywords: ["load", "add", "sub", "mul", "div", "write"],
    writeop_keywords: ["store", "read"],
    jump_keywords: ["jump", "jgtz", "jzero"],
    noop_keywords: ["halt"],

    digits: /\d+/,

    tokenizer: {
      root: [
        [/\s*[a-zA-Z_]\w*:/, "tag"], // "annotation"

        // keywords
        [
          /[a-zA-Z_$][\w$]*/,
          {
            cases: {
              "@readop_keywords": { token: "keyword.$0", next: "after_readop_keyword" },
              "@writeop_keywords": { token: "keyword.$0", next: "after_writeop_keyword" },
              "@jump_keywords": { token: "keyword.$0", next: "after_jump_keyword" },
              "@noop_keywords": { token: "keyword.$0", next: "after_noop_keyword" },
              "@default": "invalid",
            },
          },
        ],
        { include: "@whitespace" },
        [/(@digits)/, "number"],
      ],

      whitespace: [
        [/[ \t]+/, ""],
        [/$/, "", "@popall"],
        [/;.*$/, "comment", "@popall"],
      ],

      after_writeop_keyword: [{ include: "@whitespace" }, [/\d+/, "number", "root"], [/\*\d+/, "number", "root"], [/.*/, "invalid", "root"]],
      after_readop_keyword: [[/=\d+/, "number", "root"], { include: "@after_writeop_keyword" }],
      after_jump_keyword: [{ include: "@whitespace" }, [/\s*[a-zA-Z_]\w*/, "tag", "root"], [/.*/, "invalid", "root"]],
      after_noop_keyword: [{ include: "@whitespace" }, [/.*/, "invalid", "root"]],
    },
  };
}

const exampleProgram = `; EXAMPLE
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
HALT
JUMP a ; <-- TODO this highlighting is bugged
`;

export function createEditor(): monaco.editor.IStandaloneCodeEditor {
  // Adapted from playground:
  // https://microsoft.github.io/monaco-editor/playground.html?source=v0.55.1#example-extending-language-services-custom-languages

  // Register a new language
  monaco.languages.register({ id: "ramMachineAssembly" });

  // Register a tokens provider for the language
  monaco.languages.setMonarchTokensProvider("ramMachineAssembly", ramMachineAssemblyMonarchLanguage());

  // Register a completion item provider for the new language
  monaco.languages.registerCompletionItemProvider("ramMachineAssembly", {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      const suggestions: monaco.languages.CompletionItem[] = [
        ...[
          ["LOAD", "Load a value into r₀"],
          ["STORE", "Store a value from r₀"],
          ["ADD", "Increment r₀ by a value"],
          ["SUB", "Decrement r₀ by a value"],
          ["MUL", "Multiply r₀ by a value"],
          ["DIV", "Divide r₀ by a value"],
          ["READ", "Read from the tape"],
          ["WRITE", "Write to the tape"],
        ].map(([instruction, detail]) => ({
          label: instruction,
          detail: detail,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: instruction + " ${1:}",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: range,
        })),
        ...[
          ["JUMP", "Unconditional jump"],
          ["JGTZ", "Jump only if r₀ > 0"],
          ["JZERO", "Jump only if r₀ == 0"],
        ].map(([instruction, detail]) => ({
          label: instruction,
          detail: detail,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: instruction + " ${1:label}",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: range,
        })),
        {
          label: "HALT",
          detail: "Stop program execution",
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: "HALT",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: range,
        },
        ...[
          ["if r₀ <= 0", "if statement with JGTZ", ["; if r₀ <= 0", "JGTZ ${1:endif}", "\t${0:; code ...}", "$1:", ""].join("\n")],
          ["if r₀ != 0", "if statement with JZERO", ["; if r₀ != 0", "JZERO ${1:endif}", "\t${0:; code ...}", "$1:", ""].join("\n")],
          ["if r₀ > 0", "if statement with JGTZ", ["; if r₀ > 0", "JGTZ ${1:if}", "JUMP ${2:endif}", "$1:", "\t${0:; code ...}", "$2:", ""].join("\n")],
          ["if r₀ == 0", "if statement with JZERO", ["; if r₀ == 0", "JZERO ${1:if}", "JUMP ${2:endif}", "$1:", "\t${0:; code ...}", "$2:", ""].join("\n")],
          [
            "if-else r₀ <= 0",
            "if-else statement with JGTZ",
            [
              "; if r₀ <= 0",
              "JGTZ ${1:else}",
              "\t${2:; ... code if true (r₀ <= 0)}",
              "JUMP ${3:endif}",
              "$1:",
              "\t${4:; ... code if false (r₀ > 0)}",
              "$3:",
              "",
            ].join("\n"),
          ],
          [
            "if-else r₀ != 0",
            "if-else statement with JZERO",
            [
              "; if r₀ != 0",
              "JZERO ${1:else}",
              "\t${2:; ... code if true (r₀ != 0)}",
              "JUMP ${3:endif}",
              "$1:",
              "\t${4:; ... code if false (r₀ == 0)}",
              "$3:",
              "",
            ].join("\n"),
          ],
          [
            "while r₀ <= 0",
            "while loop with JGTZ",
            ["; while r₀ <= 0", "${1:loop}:", "JGTZ ${2:endloop}", "\t${0:; code ...}", "JUMP $1", "$2:", ""].join("\n"),
          ],
          [
            "while r₀ != 0",
            "while loop with JZERO",
            ["; while r₀ != 0", "${1:loop}:", "JZERO ${2:endloop}", "\t${0:; code ...}", "JUMP $1", "$2:", ""].join("\n"),
          ],
          [
            "while r₀ > 0",
            "while loop with JGTZ",
            ["; while r₀ > 0", "JUMP ${1:loopcheck}", "${2:loop}:", "\t${0:; code ...}", "$1:", "JGTZ $2", ""].join("\n"),
          ],
          [
            "while r₀ == 0",
            "while loop with JZERO",
            ["; while r₀ == 0", "JUMP ${1:loopcheck}", "${2:loop}:", "\t${0:; code ...}", "$1:", "JZERO $2", ""].join("\n"),
          ],
          ["do-while r₀ > 0", "do-while loop with JGTZ", ["; do", "${1:loop}:", "\t${0:; code ...}", "; while r₀ > 0;", "JGTZ $1", ""].join("\n")],
          ["do-while r₀ == 0", "do-while loop with JZERO", ["; do", "${1:loop}:", "\t${0:; code ...}", "; while r₀ == 0;", "JZERO $1", ""].join("\n")],
          [
            "do-while r₀ <= 0",
            "do-while loop with JGTZ",
            ["; do", "${1:loop}:", "\t${0:; code ...}", "; while r₀ <= 0;", "JGTZ ${2:endloop}", "JUMP $1", "$2:"].join("\n"),
          ],
          [
            "do-while r₀ != 0",
            "do-while loop with JZERO",
            ["; do", "${1:loop}:", "\t${0:; code ...}", "; while r₀ != 0;", "JZERO ${2:endloop}", "JUMP $1", "$2:"].join("\n"),
          ],
          ["loop", "Endless loop", ["; endless loop", "${1:loop}:", "\t${0:; code ...}", "JUMP $1"].join("\n")],
        ].map(
          ([label, detail, insertText]): monaco.languages.CompletionItem => ({
            label,
            detail,
            sortText: "zzz" + label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
          })
        ),
      ];
      return { suggestions: suggestions };
    },
  });

  const editor = monaco.editor.create(Nodes.programTextEditorContainer, {
    value: exampleProgram,
    language: "ramMachineAssembly",
  });
  return editor;
}

import * as monaco from "monaco-editor";
import { Nodes } from "./Nodes";
import { DEFAULT_PROGRAM_ASSEMBLY } from "./Examples";
import { preferences } from "./Settings";
import { t } from "./Localization";

function ramMachineAssemblyMonarchLanguage(): monaco.languages.IMonarchLanguage {
  return {
    ignoreCase: true,
    unicode: true,
    defaultToken: "",
    tokenPostfix: ".ram",

    readop_keywords: ["load", "add", "sub", "mult", "div", "write"],
    writeop_keywords: ["store", "read"],
    jump_keywords: ["jump", "jgtz", "jzero"],
    noop_keywords: ["halt"],

    tokenizer: {
      root: [
        [/\s*[\p{L}_][\p{L}_0-9\s]*:/u, "tag"], // "annotation"

        // keywords at the end of the line
        [
          /[a-zA-Z_$][\w]*$/,
          {
            cases: {
              "@readop_keywords": { token: "keyword.$0", next: "@popall" },
              "@writeop_keywords": { token: "keyword.$0", next: "@popall" },
              "@jump_keywords": { token: "keyword.$0", next: "@popall" },
              "@noop_keywords": { token: "keyword.$0", next: "@popall" },
              "@default": "invalid",
            },
          },
        ],

        // keywords with something after them
        [
          /[a-zA-Z_$][\w]*/,
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

        // whitespace
        { include: "@whitespace" },

        // number
        [/\d+/, "number"],
      ],

      whitespace: [
        [/[ \t]*$/, "", "@popall"],
        [/[ \t]+/, ""],
        [/;.*$/, "comment", "@popall"],
      ],

      after_writeop_keyword: [
        { include: "@whitespace" },
        [/\d+/, "number", "root"],
        [/\*\d+/, "number", "root"],
        [/.*/, "invalid", "root"],
      ],
      after_readop_keyword: [[/=-?\d+/, "number", "root"], { include: "@after_writeop_keyword" }],
      after_jump_keyword: [
        { include: "@whitespace" },
        [/\s*[\p{L}_][\p{L}_0-9\s]*/u, "tag", "root"],
        [/.*/, "invalid", "root"],
      ],
      after_noop_keyword: [{ include: "@whitespace" }, [/.*/, "invalid", "root"]],
    },
  };
}

const snippetsSource = [
  [
    "if r₀ <= 0",
    "if statement with JGTZ",
    ["; if r₀ <= 0", "JGTZ ${1:endif}", "\t${0:; code ...}", "$1:", ""].join("\n"),
  ],
  [
    "if r₀ != 0",
    "if statement with JZERO",
    ["; if r₀ != 0", "JZERO ${1:endif}", "\t${0:; code ...}", "$1:", ""].join("\n"),
  ],
  [
    "if r₀ > 0",
    "if statement with JGTZ",
    ["; if r₀ > 0", "JGTZ ${1:if}", "JUMP ${2:endif}", "$1:", "\t${0:; code ...}", "$2:", ""].join("\n"),
  ],
  [
    "if r₀ == 0",
    "if statement with JZERO",
    ["; if r₀ == 0", "JZERO ${1:if}", "JUMP ${2:endif}", "$1:", "\t${0:; code ...}", "$2:", ""].join("\n"),
  ],
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
  [
    "do-while r₀ > 0",
    "do-while loop with JGTZ",
    ["; do", "${1:loop}:", "\t${0:; code ...}", "; while r₀ > 0;", "JGTZ $1", ""].join("\n"),
  ],
  [
    "do-while r₀ == 0",
    "do-while loop with JZERO",
    ["; do", "${1:loop}:", "\t${0:; code ...}", "; while r₀ == 0;", "JZERO $1", ""].join("\n"),
  ],
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
];

function provideCompletionItems(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  _context: monaco.languages.CompletionContext,
  _token: monaco.CancellationToken
): monaco.languages.ProviderResult<monaco.languages.CompletionList> {
  const word = model.getWordUntilPosition(position);
  const range = {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn,
  };

  const snippets: monaco.languages.CompletionItem[] = preferences.getCodeSnippetsEnabled()
    ? [
        ...snippetsSource.map(
          ([label, detail, insertText]): monaco.languages.CompletionItem => ({
            label,
            detail,
            sortText: "zzzzzzzz" + label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
          })
        ),
      ]
    : [];
  const keywords: monaco.languages.CompletionItem[] = [
    ...[
      ["LOAD", "Load a value into r₀"],
      ["STORE", "Store a value from r₀"],
      ["ADD", "Increment r₀ by a value"],
      ["SUB", "Decrement r₀ by a value"],
      ["MULT", "Multiply r₀ by a value"],
      ["DIV", "Divide r₀ by a value"],
      ["READ", "Read from the tape"],
      ["WRITE", "Write to the tape"],
      ["JUMP", "Unconditional jump"],
      ["JGTZ", "Jump only if r₀ > 0"],
      ["JZERO", "Jump only if r₀ == 0"],
      ["HALT", "Stop program execution"],
    ].map(([instruction, detail]) => ({
      label: instruction,
      detail: detail,
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: instruction + "",
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: range,
    })),
  ];
  const suggestions: monaco.languages.CompletionItem[] = [...keywords, ...snippets];
  return { suggestions: suggestions };
}

function initializeEditorKeybinds(editor: monaco.editor.IStandaloneCodeEditor) {
  monaco.editor.addKeybindingRules([
    {
      keybinding: monaco.KeyMod.Alt | monaco.KeyCode.Enter,
      command: "editor.action.insertLineAfter",
    },
  ]);

  monaco.editor.addEditorAction({
    id: "ramMachine.action.compile",
    label: t.editor.actions.compile,
    run: () => {
      compileEditorSourceCode();
    },
    contextMenuGroupId: "compile",
    contextMenuOrder: 0,
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
  });
  monaco.editor.addEditorAction({
    id: "ramMachine.action.compileAndRun",
    label: t.editor.actions.compileAndRun,
    run: () => {
      compileAndRunEditorSourceCode();
    },
    contextMenuGroupId: "compile",
    contextMenuOrder: 1,
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter],
  });
}

export function createEditor(): monaco.editor.IStandaloneCodeEditor {
  // Adapted from playground:
  // https://microsoft.github.io/monaco-editor/playground.html?source=v0.55.1#example-extending-language-services-custom-languages

  // Register a new language
  monaco.languages.register({ id: "ramMachineAssembly" });

  // Register a tokens provider for the language
  monaco.languages.setMonarchTokensProvider("ramMachineAssembly", ramMachineAssemblyMonarchLanguage());

  // Register a completion item provider for the new language
  monaco.languages.registerCompletionItemProvider("ramMachineAssembly", { provideCompletionItems });

  // Create editor
  const editor = monaco.editor.create(Nodes.codeEditorContainer, {
    value: DEFAULT_PROGRAM_ASSEMBLY,
    language: "ramMachineAssembly",
    wordBasedSuggestions: "allDocuments",
  });

  // Initialize keybinds
  initializeEditorKeybinds(editor);

  // Responsive layout
  let timeout: number | null = null;
  const resizeObserver = new ResizeObserver(() => {
    if (timeout !== null) {
      window.clearTimeout(timeout);
    }
    timeout = window.setTimeout(() => {
      editor.layout();
    }, 50);
  });
  resizeObserver.observe(Nodes.codeEditorPane);
  return editor;
}

export function compileEditorSourceCode() {
  const sourceText = window.RAMMachine.editor.getValue();
  window.RAMMachine.machine.loadAssemblyAndReset(sourceText);
}

export function compileAndRunEditorSourceCode() {
  const sourceText = window.RAMMachine.editor.getValue();
  const output = window.RAMMachine.machine.loadAssemblyAndReset(sourceText);
  if (output.success) {
    window.RAMMachine.machine.runAll(false, { timeoutAutoKill: 500 });
    // TODO: display errors in status pane for all undetached runAll calls
  }
}

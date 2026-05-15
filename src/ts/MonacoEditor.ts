import * as monaco from "monaco-editor";
import { getTitleForMessageBox, makeCompilerMessageBox, makeStatusBox, Nodes } from "./Nodes";
import { DEFAULT_PROGRAM_ASSEMBLY } from "./Examples";
import { preferences } from "./Settings";
import { formatString, plural, t } from "./Localization";
import { Compiler, CompilerMessage, MessageSeverity } from "./Compiler";
import { unwrap } from "./Util";

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

const s = t.editor.snippets;
const snippetsSource = [
  [
    "if r₀ <= 0",
    s.name.iflte,
    ["; if r₀ <= 0", "JGTZ ${1:" + s.label.endif + "}", "\t${0:; " + s.codePlaceholder + "}", "$1:", ""].join("\n"),
  ],
  [
    "if r₀ != 0",
    s.name.ifne,
    ["; if r₀ != 0", "JZERO ${1:" + s.label.endif + "}", "\t${0:; " + s.codePlaceholder + "}", "$1:", ""].join("\n"),
  ],
  [
    "if r₀ > 0",
    s.name.ifge,
    [
      "; if r₀ > 0",
      "JGTZ ${1:" + s.label.if + "}",
      "JUMP ${2:" + s.label.endif + "}",
      "$1:",
      "\t${0:; " + s.codePlaceholder + "}",
      "$2:",
      "",
    ].join("\n"),
  ],
  [
    "if r₀ == 0",
    s.name.ifeq,
    [
      "; if r₀ == 0",
      "JZERO ${1:" + s.label.if + "}",
      "JUMP ${2:" + s.label.endif + "}",
      "$1:",
      "\t${0:; " + s.codePlaceholder + "}",
      "$2:",
      "",
    ].join("\n"),
  ],
  [
    "if-else r₀ <= 0",
    s.name.ifelselte,
    [
      "; if r₀ <= 0",
      "JGTZ ${1:" + s.label.else + "}",
      "\t${2:; " + s.codeIfTrue + " (r₀ <= 0)}",
      "JUMP ${3:" + s.label.endif + "}",
      "$1:",
      "\t${4:; " + s.codeIfFalse + " (r₀ > 0)}",
      "$3:",
      "",
    ].join("\n"),
  ],
  [
    "if-else r₀ != 0",
    s.name.ifelsene,
    [
      "; if r₀ != 0",
      "JZERO ${1:" + s.label.else + "}",
      "\t${2:; " + s.codeIfTrue + " (r₀ != 0)}",
      "JUMP ${3:" + s.label.endif + "}",
      "$1:",
      "\t${4:; " + s.codeIfFalse + " (r₀ == 0)}",
      "$3:",
      "",
    ].join("\n"),
  ],
  [
    "while r₀ <= 0",
    s.name.whilelte,
    [
      "; while r₀ <= 0",
      "${1:" + s.label.loop + "}:",
      "JGTZ ${2:" + s.label.endloop + "}",
      "\t${0:; " + s.codePlaceholder + "}",
      "JUMP $1",
      "$2:",
      "",
    ].join("\n"),
  ],
  [
    "while r₀ != 0",
    s.name.whilene,
    [
      "; while r₀ != 0",
      "${1:" + s.label.loop + "}:",
      "JZERO ${2:" + s.label.endloop + "}",
      "\t${0:; " + s.codePlaceholder + "}",
      "JUMP $1",
      "$2:",
      "",
    ].join("\n"),
  ],
  [
    "while r₀ > 0",
    s.name.whilegt,
    [
      "; while r₀ > 0",
      "JUMP ${1:" + s.label.loopcheck + "}",
      "${2:" + s.label.loop + "}:",
      "\t${0:; " + s.codePlaceholder + "}",
      "$1:",
      "JGTZ $2",
      "",
    ].join("\n"),
  ],
  [
    "while r₀ == 0",
    s.name.whileeq,
    [
      "; while r₀ == 0",
      "JUMP ${1:" + s.label.loopcheck + "}",
      "${2:" + s.label.loop + "}:",
      "\t${0:; " + s.codePlaceholder + "}",
      "$1:",
      "JZERO $2",
      "",
    ].join("\n"),
  ],
  [
    "do-while r₀ > 0",
    s.name.dowhilegt,
    ["; do", "${1:" + s.label.loop + "}:", "\t${0:; " + s.codePlaceholder + "}", "; while r₀ > 0;", "JGTZ $1", ""].join(
      "\n"
    ),
  ],
  [
    "do-while r₀ == 0",
    s.name.dowhileeq,
    [
      "; do",
      "${1:" + s.label.loop + "}:",
      "\t${0:; " + s.codePlaceholder + "}",
      "; while r₀ == 0;",
      "JZERO $1",
      "",
    ].join("\n"),
  ],
  [
    "do-while r₀ <= 0",
    s.name.dowhilelte,
    [
      "; do",
      "${1:" + s.label.loop + "}:",
      "\t${0:; " + s.codePlaceholder + "}",
      "; while r₀ <= 0;",
      "JGTZ ${2:" + s.label.endloop + "}",
      "JUMP $1",
      "$2:",
    ].join("\n"),
  ],
  [
    "do-while r₀ != 0",
    s.name.dowhilene,
    [
      "; do",
      "${1:" + s.label.loop + "}:",
      "\t${0:; " + s.codePlaceholder + "}",
      "; while r₀ != 0;",
      "JZERO ${2:" + s.label.endloop + "}",
      "JUMP $1",
      "$2:",
    ].join("\n"),
  ],
  [
    "loop",
    s.name.loop,
    ["; " + s.endlessLoopComment, "${1:" + s.label.loop + "}:", "\t${0:; " + s.codePlaceholder + "}", "JUMP $1"].join(
      "\n"
    ),
  ],
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
    ...Object.entries(t.editor.keywords).map(([instruction, detail]) => ({
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
  let resizeTimeout: number | null = null;
  const resizeObserver = new ResizeObserver(() => {
    if (resizeTimeout !== null) {
      window.clearTimeout(resizeTimeout);
    }
    resizeTimeout = window.setTimeout(() => {
      editor.layout();
    }, 50);
  });
  resizeObserver.observe(Nodes.codeEditorPane);

  // Auto error checking
  const quickCompileTimeoutMs = 500;
  let quickCompileTimeout: number | null = null;
  editor.getModel()?.onDidChangeContent(() => {
    if (quickCompileTimeout !== null) {
      window.clearTimeout(quickCompileTimeout);
    }
    quickCompileTimeout = window.setTimeout(() => {
      quickCompile();
    }, quickCompileTimeoutMs);
  });

  return editor;
}

export function compileEditorSourceCode() {
  const sourceText = window.RAMMachine.editor.getValue();
  window.RAMMachine.machine.loadAssemblyAndReset(sourceText, false);
}

export function compileAndRunEditorSourceCode() {
  const sourceText = window.RAMMachine.editor.getValue();
  const output = window.RAMMachine.machine.loadAssemblyAndReset(sourceText, false);
  if (output.success) {
    window.RAMMachine.machine.runAll(false, { timeoutAutoKill: 500 });
    // TODO: display runtime errors in status pane for all undetached runAll calls
  }
}

export function showProblems() {
  // let actions = window.RAMMachine.editor.getSupportedActions().map((a) => a.id);
  // console.log(actions);
  unwrap(window.RAMMachine.editor.getAction("editor.action.marker.next")).run();
}

export function goToLine(lineNumber: number, column: number = 999, selectLine = false) {
  window.RAMMachine.editor.setPosition({ lineNumber, column });
  if (selectLine) {
    window.RAMMachine.editor.setSelection({
      startLineNumber: lineNumber,
      startColumn: 0,
      endLineNumber: lineNumber,
      endColumn: 999,
    });
  }
  window.RAMMachine.editor.revealLineInCenterIfOutsideViewport(lineNumber);
  window.RAMMachine.editor.focus();
}

let editorDecorations: monaco.editor.IEditorDecorationsCollection | null = null;

export function highlightLine(lineNumber: number, hoverMessage: string, className?: string, inlineClassName?: string) {
  if (editorDecorations === null) {
    editorDecorations = window.RAMMachine.editor.createDecorationsCollection();
  }
  editorDecorations.clear();
  editorDecorations.set([
    {
      range: {
        startLineNumber: lineNumber,
        startColumn: 0,
        endLineNumber: lineNumber,
        endColumn: 999,
      },
      options: {
        isWholeLine: false,
        className,
        inlineClassName,
        hoverMessage: { value: hoverMessage },
      },
    },
  ]);
}

export function clearDecorations() {
  if (editorDecorations !== null) {
    editorDecorations.clear();
  }
}

const messageSeverityMap: { [K in MessageSeverity]: monaco.MarkerSeverity } = {
  error: monaco.MarkerSeverity.Error,
  warning: monaco.MarkerSeverity.Warning,
};

export function updateCompileProblems(success: boolean, compilerMessages: CompilerMessage[]) {
  // Update count of errors in editor pane
  let errorCount = 0;
  let warningCount = 0;
  compilerMessages.forEach((msg) => {
    if (msg.type === "error") {
      errorCount++;
    } else if (msg.type === "warning") {
      warningCount++;
    }
  });
  Nodes.showProblemsButton.textContent = formatString(
    t.editor.problems.template,
    plural(errorCount, t.editor.problems.errorCount),
    plural(warningCount, t.editor.problems.warningCount)
  );

  // List compile errors in status pane
  Nodes.compileErrorsContainer.innerHTML = "";
  compilerMessages.forEach((msg) => {
    const box = makeCompilerMessageBox(msg);
    Nodes.compileErrorsContainer.appendChild(box);
  });

  // Add success box
  if (success) {
    const box = makeStatusBox(t.status.compilation.success, "success");
    Nodes.compileErrorsContainer.appendChild(box);
  } else {
    const box = makeStatusBox(t.status.compilation.failure, "warning");
    Nodes.compileErrorsContainer.appendChild(box);
  }

  // Add markers in the editor
  const model = window.RAMMachine.editor.getModel();
  if (model === null) return;

  const markers: monaco.editor.IMarkerData[] = [];
  compilerMessages.forEach((msg) => {
    const line = msg.line || 1;
    markers.push({
      message: `${getTitleForMessageBox(msg.body.category)}${msg.body.message}`,
      severity: messageSeverityMap[msg.type],
      startLineNumber: line,
      startColumn: 1,
      endLineNumber: line,
      endColumn: model.getLineLength(line) + 1,
    });
  });
  try {
    monaco.editor.setModelMarkers(model, "owner", markers);
  } catch (e) {
    console.warn("Could not set compile error markers in monaco editor:", e);
  }
}

let oldSourceText = "";

export function quickCompile(force = false) {
  const sourceText = window.RAMMachine.editor.getValue();
  if (!force && sourceText === oldSourceText) return;
  oldSourceText = sourceText;

  const compiler = new Compiler();
  const { success, messages } = compiler.compile(sourceText);
  updateCompileProblems(success, messages);
}

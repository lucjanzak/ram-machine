/// @no-format
import { initChartDOM } from "./Chart";
import { initFileDrop } from "./LoadFile";
import { formatString, t } from "./Localization";
import { CompilerMessage } from "./Parser";
import { initSettingsDOM } from "./Settings";
import { assertEq, assertNever, expect } from "./Util";

export namespace Nodes {
  function element<T extends Element = Element>(selector: string) {
    return expect(document.querySelector<T>(selector), `element with selector '${selector}' not found`);
  }

  // Static elements
  export const newProgramButton = element("#new-program-button");
  export const openProgramButton = element("#open-program-button");
  export const saveProgramButton = element("#save-program-button");
  export const settingsButton = element("#settings-button");
  export const clearInputTapeButton = element("#clear-input-tape-button");
  export const editInputTapeButton = element("#edit-input-tape-button");
  export const runAllButton = element("#run-all-button");
  export const resetButton = element("#reset-button");
  export const stepButton = element("#step-button");
  export const loadProgramButtons = element("#load-program-buttons");
  export const chartsButton = element("#charts-button");
  export const aboutButton = element("#about-button");
  export const programListingTable = element("#program-listing-table");
  // export const programTextEditorBasic = element<HTMLTextAreaElement>("#program-text-editor-basic");
  export const programTextEditorContainer = element<HTMLElement>("#program-text-editor-container");
  export const programListing = element("#program-listing");
  export const stats = element("#stats");
  export const registerScrollList = element<HTMLElement>("#register-scroll-list");
  export const inputTape = element<HTMLElement>("#input-tape");
  export const inputTapeLength = element("#input-tape-length");
  export const outputTape = element<HTMLElement>("#output-tape");
  export const outputTapeLength = element("#output-tape-length");

  // export const loadFileForm = element<HTMLFormElement>("#load-file-form");
  export const loadFileInput = element<HTMLInputElement>("#load-file-input");
  export const loadFileDropZone = element("#load-file-drop-zone");
  export const loadFileTextareaPreview = element<HTMLTextAreaElement>("#load-file-textarea-preview");
  export const loadFileStatusContainer = element("#load-file-status-container");

  export const settingsForm = element<HTMLFormElement>("#settings-form");

  export const chartCanvas = element<HTMLCanvasElement>("#chart-canvas");
  export const chartSettingsForm = element<HTMLFormElement>("#chart-settings-form");
  export const generatePointsInput = element<HTMLInputElement>("#generate-points-input");
  export const generatePointsButton = element("#generate-points-button");
  export const executionTimeoutInput = element<HTMLInputElement>("#execution-timeout-input");
  export const toggleRealTimeAxis = element<HTMLInputElement>("#toggle-realtime-axis");
  export const clearChartButton = element("#clear-chart-button");
  export const closeChartButton = element("#close-chart-button");

  export const bigScrollListTest = element<HTMLElement>("#big-scroll-list-test");
}

export namespace Templates {
  function template(selector: string) {
    const element = expect(
      document.querySelector<HTMLTemplateElement>(`template${selector}`),
      `template with selector '${selector}' not found`
    );
    assertEq(element.tagName, "TEMPLATE");
    return element;
  }

  export const commentTile = template("#comment-tile");
  export const instructionTile = template("#instruction-tile");
  export const statsRow = template("#stats-row");
  export const registerRow = template("#register-row");
  export const inputTapeCell = template("#input-tape-cell");
  export const outputTapeCell = template("#output-tape-cell");
  export const bigScrollListTestRow = template("#big-scroll-list-test-row");
  export const statusBox = template("#status-box");
  export const compilerMessage = template("#compiler-message");
}

export namespace Dialogs {
  function dialog(selector: string) {
    const element = expect(
      document.querySelector<HTMLDialogElement>(`dialog${selector}`),
      `dialog with selector '${selector}' not found`
    );
    assertEq(element.tagName, "DIALOG");
    return element;
  }

  export const loadFile = dialog("#load-file");
  export const settings = dialog("#settings");
  export const chartWindow = dialog("#chart-window");
  export const about = dialog("#about");
}

export function useTemplate(instructionTile: HTMLTemplateElement) {
  return document.importNode(instructionTile.content, true);
}

export function select<T extends Element = Element>(f: ParentNode, selector: string) {
  return expect(f.querySelector<T>(selector), `element with selector '${selector}' not found in f: ${f}`);
}

export function initDOM() {
  initFileDrop();
  Nodes.newProgramButton.addEventListener("click", () => {
    window.RAMMachine.machine.loadAssemblyAndReset("");
  });
  Nodes.openProgramButton.addEventListener("click", () => {
    Nodes.loadFileTextareaPreview.value = "";
    Nodes.loadFileStatusContainer.innerHTML = "";
    Dialogs.loadFile.showModal();
  });
  Nodes.settingsButton.addEventListener("click", () => {
    Dialogs.settings.showModal();
  });
  Nodes.clearInputTapeButton.addEventListener("click", () => {
    const answer = confirm(t.nav.clearInputTapePrompt);
    if (answer) {
      window.RAMMachine.machine.loadTapeFromText("");
    }
  });
  Nodes.editInputTapeButton.addEventListener("click", () => {
    const currentTape = window.RAMMachine.machine.inputTape.asString();
    const answer = prompt(t.nav.editInputTapePrompt, currentTape);
    if (answer !== null) {
      window.RAMMachine.machine.loadTapeFromText(answer);
    }
  });
  Nodes.runAllButton.addEventListener("click", () => {
    window.RAMMachine.machine.runAll(false);
  });
  Nodes.resetButton.addEventListener("click", () => {
    window.RAMMachine.machine.reset();
  });
  Nodes.stepButton.addEventListener("click", () => {
    window.RAMMachine.machine.step();
  });
  Nodes.chartsButton.addEventListener("click", () => {
    Dialogs.chartWindow.showModal();
  });
  Nodes.aboutButton.addEventListener("click", () => {
    Dialogs.about.showPopover();
  });

  initChartDOM();
  initSettingsDOM();
}

export function makeStatusBox(message: string, type: "error" | "warning" | "success"): DocumentFragment {
  const f = useTemplate(Templates.statusBox);

  const box = select(f, ".status-box");
  box.classList.add(type);

  const messageSpan = select(f, ".message");
  messageSpan.textContent = message;
  return f;
}

export function makeCompilerMessageBox(msg: CompilerMessage): DocumentFragment {
  const f = useTemplate(Templates.compilerMessage);

  const box = select(f, ".status-box");
  box.classList.add(msg.type);

  const titleSpan = select(f, ".title");
  if (msg.body.category === "preprocessor") {
    titleSpan.textContent = `${t.compiler.preprocessorErrorTitle}`;
  } else if (msg.body.category === "parser") {
    titleSpan.textContent = `${t.compiler.parserErrorTitle}`;
  } else {
    assertNever(msg.body);
  }

  const errorIdSpan = select(f, ".error-id");
  errorIdSpan.textContent = `<${msg.body.id}>`;

  const messageSpan = select(f, ".message");
  messageSpan.textContent = `${msg.body.message}`;

  const lineLocation = select(f, ".line-location");
  lineLocation.textContent =
    msg.line === undefined
      ? ""
      : msg.col === undefined
      ? formatString(t.compiler.atLine, `${msg.line}`)
      : formatString(t.compiler.atLineCol, `${msg.line}`, `${msg.col}`);
  return f;
}

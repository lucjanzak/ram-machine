/// @no-format
import { initChartDOM } from "./Chart";
import { initFileDrop as initLoadFileDOM } from "./LoadFile";
import { initSettingsDOM } from "./Settings";
import { assertEq, expect } from "./Util";
import { initEditorPaneDOM } from "./MonacoEditor";
import { PaneName } from "./Panes";
import { initNavDOM } from "./Nav";
import { initSaveFileDOM } from "./SaveFile";

export namespace Nodes {
  function element<T extends Element = Element>(selector: string) {
    return expect(document.querySelector<T>(selector), `element with selector '${selector}' not found`);
  }

  // Navbar buttons
  export const newProgramButton = element("#new-program-button");
  export const loadProgramButton = element("#load-program-button");
  export const saveProgramButton = element("#save-program-button");
  export const settingsButton = element("#settings-button");
  export const clearInputTapeButton = element("#clear-input-tape-button");
  export const editInputTapeButton = element("#edit-input-tape-button");
  export const runAllButton = element("#run-all-button");
  export const resetButton = element("#reset-button");
  export const stepButton = element("#step-button");
  export const chartsButton = element("#charts-button");
  export const aboutButton = element("#about-button");
  export const viewRegisterPaneButton = element("#view-register-pane-button");
  export const viewProgramListingPaneButton = element("#view-program-listing-pane-button");
  export const viewStatusPaneButton = element("#view-status-pane-button");
  export const viewCodeEditorPaneButton = element("#view-code-editor-pane-button");
  export const viewButtons: { [K in PaneName]: Element } = {
    register: viewRegisterPaneButton,
    programListing: viewProgramListingPaneButton,
    status: viewStatusPaneButton,
    codeEditor: viewCodeEditorPaneButton,
  };

  // Panes
  export const registerPane = element("#register-pane");
  export const programListingPane = element("#program-listing-pane");
  export const statusPane = element("#status-pane");
  export const codeEditorPane = element("#code-editor-pane");
  export const panes: { [K in PaneName]: Element } = {
    register: registerPane,
    programListing: programListingPane,
    status: statusPane,
    codeEditor: codeEditorPane,
  };

  // Pane elements
  export const programListingTable = element("#program-listing-table");
  // export const codeEditorBasic = element<HTMLTextAreaElement>("#code-editor-basic");
  export const codeEditorContainer = element<HTMLElement>("#code-editor-container");
  export const programListing = element("#program-listing");
  export const compileErrorsContainer = element("#compile-errors-container");
  export const runtimeErrorsContainer = element("#runtime-errors-container");
  export const stats = element("#stats");
  export const registerScrollList = element<HTMLElement>("#register-scroll-list");
  export const inputTape = element<HTMLElement>("#input-tape");
  export const inputTapeLength = element("#input-tape-length");
  export const outputTape = element<HTMLElement>("#output-tape");
  export const outputTapeLength = element("#output-tape-length");
  export const compileButton = element("#compile-button");
  export const compileAndRunButton = element("#compile-and-run-button");
  export const showProblemsButton = element("#show-problems-button");

  // Load file dialog
  // export const loadFileForm = element<HTMLFormElement>("#load-file-form");
  export const loadFileInput = element<HTMLInputElement>("#load-file-input");
  export const loadFileDropZone = element("#load-file-drop-zone");
  export const loadFileTextareaPreview = element<HTMLTextAreaElement>("#load-file-textarea-preview");
  export const loadFileStatusContainer = element("#load-file-status-container");
  export const loadProgramButtons = element("#load-program-buttons");

  // Save file dialog
  export const saveFileTextareaPreview = element<HTMLTextAreaElement>("#save-file-textarea-preview");
  export const saveFileFilename = element<HTMLInputElement>("#save-file-filename");
  export const saveFileIncludeTape = element<HTMLInputElement>("#save-file-include-tape");
  export const saveFileIncludeSettings = element<HTMLInputElement>("#save-file-include-settings");
  export const saveFileConfirm = element<HTMLInputElement>("#save-file-confirm");

  // Settings dialog
  export const settingsForm = element<HTMLFormElement>("#settings-form");

  // Chart dialog
  export const chartCanvas = element<HTMLCanvasElement>("#chart-canvas");
  export const chartSettingsForm = element<HTMLFormElement>("#chart-settings-form");
  //
  export const simulationTypeSelect = element<HTMLSelectElement>("#simulation-type-select");
  //
  export const inputDataValueLabel = element("#input-data-value-label");
  export const inputDataSequenceLabel = element("#input-data-sequence-label");
  export const inputDataCustomLabel = element("#input-data-custom-label");
  //
  export const inputDataValueSelect = element<HTMLInputElement>("#input-data-value-select");
  export const inputDataSequenceSelect = element<HTMLInputElement>("#input-data-sequence-select");
  export const inputDataCustom = element<HTMLInputElement>("#input-data-custom");
  //
  export const inputDataSequenceConstLabel = element("#input-data-sequence-const-label");
  export const inputDataSequenceConst = element<HTMLInputElement>("#input-data-sequence-const");
  export const inputDataSequenceStartLabel = element("#input-data-sequence-start-label");
  export const inputDataSequenceStart = element<HTMLInputElement>("#input-data-sequence-start");
  export const inputDataSequenceStepLabel = element("#input-data-sequence-step-label");
  export const inputDataSequenceStep = element<HTMLInputElement>("#input-data-sequence-step");
  export const inputDataSequenceRandomMinLabel = element("#input-data-sequence-random-min-label");
  export const inputDataSequenceRandomMin = element<HTMLInputElement>("#input-data-sequence-random-min");
  export const inputDataSequenceRandomMaxLabel = element("#input-data-sequence-random-max-label");
  export const inputDataSequenceRandomMax = element<HTMLInputElement>("#input-data-sequence-random-max");
  export const inputDataSequenceCustomLabel = element("#input-data-sequence-custom-label");
  export const inputDataSequenceCustom = element<HTMLInputElement>("#input-data-sequence-custom");
  //
  export const generatePointsInput = element<HTMLInputElement>("#generate-points-input");
  export const generatePointsButton = element("#generate-points-button");
  export const comparisonFunctionMultiplierInput = element<HTMLInputElement>("#comparison-function-multiplier-input");
  export const comparisonFunctionSelect = element<HTMLSelectElement>("#comparison-function-select");
  export const executionTimeoutInput = element<HTMLInputElement>("#execution-timeout-input");
  export const toggleRealTimeAxis = element<HTMLInputElement>("#toggle-realtime-axis");
  export const inputDataPreview = element<HTMLTextAreaElement>("#input-data-preview");
  export const clearChartButton = element("#clear-chart-button");
  export const closeChartButton = element("#close-chart-button");

  // Testing
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
  export const saveFile = dialog("#save-file");
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
  initLoadFileDOM();
  initSaveFileDOM();
  initNavDOM();
  initEditorPaneDOM();
  initChartDOM();
  initSettingsDOM();
}

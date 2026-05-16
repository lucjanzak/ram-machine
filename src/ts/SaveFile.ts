import { editor } from "monaco-editor";
import { Dialogs, Nodes } from "./Nodes";
import { t } from "./Localization";

let textFile: string | null = null;
function makeTextFileURL(textContents: string) {
  var data = new Blob([textContents], { type: "text/plain" });
  if (textFile !== null) {
    window.URL.revokeObjectURL(textFile);
  }
  textFile = window.URL.createObjectURL(data);
  return textFile;
}

function downloadTextFile(filename: string, textContents: string) {
  var link = document.createElement("a");
  link.setAttribute("download", filename);
  link.href = makeTextFileURL(textContents);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function getActualFileContents(includeTape: boolean, includeSettings: boolean) {
  let sourceText = window.RAMMachine.editor.getValue();
  if (includeTape) {
    const s = window.RAMMachine.machine.settings;
    sourceText =
      `;.SET INPUT_TAPE_UNDERFLOW ${s.inputTapeUnderflow}\n` +
      `;.SET UNINITIALIZED_REGISTER_READ ${s.uninitializedRegisterRead}\n` +
      `;.SET PROGRAM_COUNTER_OUT_OF_BOUNDS ${s.programCounterOutOfBounds}\n` +
      sourceText;
  }
  if (includeSettings) {
    const inputTapeString = window.RAMMachine.machine.inputTape.asString();
    sourceText = `;.INPUT_TAPE ${inputTapeString}\n` + sourceText;
  }
  return sourceText;
}

export function updateSaveDataPreview() {
  const fileContents = getActualFileContents(Nodes.saveFileIncludeSettings.checked, Nodes.saveFileIncludeTape.checked);
  Nodes.saveFileTextareaPreview.value = fileContents;
}

export function showSaveDialog() {
  updateSaveDataPreview();
  Dialogs.saveFile.showModal();
}

export function saveFileAndDownload() {
  const fileContents = getActualFileContents(Nodes.saveFileIncludeSettings.checked, Nodes.saveFileIncludeTape.checked);
  let filename = Nodes.saveFileFilename.value.trim();
  if (filename === "") {
    filename = t.saveFile.defaultFileName;
  }
  downloadTextFile(filename, fileContents);
}

export function initSaveFileDOM() {
  [Nodes.saveFileIncludeSettings, Nodes.saveFileIncludeTape].forEach((el) =>
    el.addEventListener("change", () => {
      updateSaveDataPreview();
    })
  );
  updateSaveDataPreview();

  Nodes.saveFileFilename.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      saveFileAndDownload();
      Dialogs.saveFile.close();
      e.preventDefault();
    }
  });

  Nodes.saveFileConfirm.addEventListener("click", () => {
    saveFileAndDownload();
    Dialogs.saveFile.close();
  });
}

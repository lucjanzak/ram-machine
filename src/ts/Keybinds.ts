import { newFile, showLoadDialog } from "./LoadFile";
import { compileAndRunEditorSourceCode, compileEditorSourceCode } from "./MonacoEditor";
import { saveFileAndDownload, showSaveDialog } from "./SaveFile";

export function initGlobalKeybinds() {
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyN" && e.ctrlKey) {
      newFile();
      e.preventDefault();
    } else if (e.code === "KeyM" && e.ctrlKey) {
      newFile();
      e.preventDefault();
    } else if (e.code === "KeyO" && e.ctrlKey) {
      showLoadDialog();
      e.preventDefault();
    } else if (e.code === "KeyS" && e.ctrlKey && e.shiftKey) {
      showSaveDialog();
      e.preventDefault();
    } else if (e.code === "KeyS" && e.ctrlKey && !e.shiftKey) {
      saveFileAndDownload();
      e.preventDefault();
    } else if (e.code === "Enter" && e.ctrlKey && e.shiftKey) {
      compileAndRunEditorSourceCode();
      e.preventDefault();
    } else if (e.code === "Enter" && e.ctrlKey && !e.shiftKey) {
      compileEditorSourceCode();
      e.preventDefault();
    }
  });
}

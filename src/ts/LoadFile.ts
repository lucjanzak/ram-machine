import { t } from "./Localization";
import { makeCompilerMessageBox, makeStatusBox, Nodes } from "./Nodes";
import { CompilerMessage, Compiler } from "./Compiler";
import { updateCompileProblems } from "./MonacoEditor";

function fileFinishedLoading(fileContents: string) {
  Nodes.loadFileTextareaPreview.value = fileContents;

  const compiler = new Compiler();
  const compilerOutput = compiler.compile(fileContents);

  if (compilerOutput.success) {
    Nodes.loadFileStatusContainer.append(makeStatusBox(t.loadFile.loadSuccess, "success"));
  } else {
    compilerOutput.messages.forEach((msg) => {
      Nodes.loadFileStatusContainer.append(makeCompilerMessageBox(msg));
    });
  }

  // TODO: add confirm button???
  window.RAMMachine.machine.loadAssemblyAndReset(fileContents);
}

function fileChanged(file: File | null) {
  Nodes.loadFileStatusContainer.innerHTML = "";
  if (file === null) {
    Nodes.loadFileTextareaPreview.value = "";
    return;
  }

  const fileReader = new FileReader();
  fileReader.readAsText(file);
  fileReader.addEventListener("load", () => {
    if (typeof fileReader.result === "string") {
      fileFinishedLoading(fileReader.result);
    }
  });
  console.log(file);
}

export function initFileDrop() {
  // File has been dropped
  Nodes.loadFileDropZone.addEventListener("drop", (event) => {
    const e = event as DragEvent;
    if (e.dataTransfer === null) return;
    e.preventDefault();
    const files = [...e.dataTransfer.items].map((item) => item.getAsFile()).filter((file) => file !== null);
    fileChanged(files[0]);
  });

  // File has been chosen - call fileChanged
  Nodes.loadFileInput.addEventListener("change", () => {
    const files = Nodes.loadFileInput.files;
    if (files !== null && files.length > 0) {
      fileChanged(files[0]);
    } else {
      fileChanged(null);
    }
  });

  // Prevent default user-agent behavior for drag & dropping files (downloading/opening)
  window.addEventListener("drop", (e) => {
    if (e.dataTransfer === null) return;
    if ([...e.dataTransfer.items].some((item) => item.kind === "file")) {
      e.preventDefault();
    }
  });

  // Show 'none' cursor when dragging files to the wrong place
  window.addEventListener("dragover", (e2) => {
    const e = e2 as DragEvent;
    if (e.dataTransfer === null) return;

    const fileItems = [...e.dataTransfer.items].filter((item) => item.kind === "file");
    if (fileItems.length > 0) {
      e.preventDefault();
      if (!Nodes.loadFileDropZone.contains(e.target as Node)) {
        e.dataTransfer.dropEffect = "none";
      }
    }
  });

  // Show 'none' cursor when dragging files with the wrong type
  Nodes.loadFileDropZone.addEventListener("dragover", (e2) => {
    const e = e2 as DragEvent;
    if (e.dataTransfer === null) return;

    const hasCorrectType = (item: DataTransferItem) =>
      item.type.startsWith("text/") || item.type === "application/ram" || item.type === "";
    const fileItems = [...e.dataTransfer.items].filter((item) => item.kind === "file");
    if (fileItems.length > 0) {
      e.preventDefault();
      if (fileItems.some(hasCorrectType)) {
        e.dataTransfer.dropEffect = "copy";
      } else {
        e.dataTransfer.dropEffect = "none";
      }
    }
  });

  fileChanged(null);
}

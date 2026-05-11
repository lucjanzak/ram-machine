import { Nodes } from "./Nodes";

export function initFileDrop() {
  const displayFiles = (files: File[] | FileList | null) => {
    if (files === null) {
      Nodes.loadFileTextareaPreview.value = "";
      return;
    }

    const filesany = files as any;
    const file: File = filesany[0];
    const fileReader = new FileReader();
    fileReader.readAsText(file);
    fileReader.addEventListener("load", () => {
      // TODO: confirm button?
      Nodes.loadFileTextareaPreview.value = fileReader.result as string;
      const { preprocessorMessages, parserMessages } = window.RAMMachine.machine.loadRAMFileAndReset(
        fileReader.result as string
      );
      console.log(preprocessorMessages, parserMessages);
      if (preprocessorMessages.length !== 0) {
        Nodes.loadFileStatusBox.textContent = preprocessorMessages.map((x) => x.message).join(",");
      } else {
        Nodes.loadFileStatusBox.textContent = "Success";
      }
    });
    console.log(files);
  };

  const dropHandler = (e: DragEvent) => {
    if (e.dataTransfer === null) return;
    e.preventDefault();
    const files = [...e.dataTransfer.items].map((item) => item.getAsFile()).filter((file) => file !== null);
    displayFiles(files);
  };
  Nodes.loadFileDropZone.addEventListener("drop", (e) => {
    dropHandler(e as DragEvent);
  });
  Nodes.loadFileInput.addEventListener("change", () => {
    displayFiles(Nodes.loadFileInput.files);
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

    const hasCorrectType = (item: DataTransferItem) => item.type.startsWith("text/") || item.type === "";
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
}

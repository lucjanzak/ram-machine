import { makeStatusBox, Nodes, select, Templates, useTemplate } from "./Nodes";
import { Parser, ParserMessage } from "./Parser";
import { preprocess, PreprocessorMessage } from "./Preprocessor";

export function initFileDrop() {
  const fileFinishedLoading = (sourceText: string) => {
    Nodes.loadFileTextareaPreview.value = sourceText;

    const dispPreMsg = (msg: PreprocessorMessage) => {
      return (
        `${msg.message}` +
        (msg.line === undefined ? "" : ` (at line ${msg.line}${msg.col === undefined ? "" : `:${msg.col}`})`)
      );
    };

    const dispParserMsg = (msg: ParserMessage) => {
      return (
        `${msg.message}` +
        (msg.line === undefined ? "" : ` (at line ${msg.line}${msg.col === undefined ? "" : `:${msg.col}`})`)
      );
    };

    // TODO: confirm button?
    // const { preprocessorMessages, parserMessages } = window.RAMMachine.machine.loadRAMFileAndReset();

    const pre = preprocess(sourceText);
    const parser = new Parser();
    const parsed = parser.parseAssemblyProgram(pre.assembly);
    const preprocessorMessages = pre.messages;
    const parserMessages = parsed.messages;
    console.log(preprocessorMessages, parserMessages);

    if (preprocessorMessages.length + parserMessages.length === 0) {
      Nodes.loadFileStatusContainer.append(makeStatusBox("File loaded successfully", "success"));
    } else {
      preprocessorMessages.forEach((msg) => {
        if (msg.type === "error") {
          Nodes.loadFileStatusContainer.append(makeStatusBox(`Preprocessor error: ${dispPreMsg(msg)}`, "error"));
        } else {
          Nodes.loadFileStatusContainer.append(makeStatusBox(`Preprocessor warning: ${dispPreMsg(msg)}`, "warning"));
        }
      });
      parserMessages.forEach((msg) => {
        if (msg.type === "error") {
          Nodes.loadFileStatusContainer.append(makeStatusBox(`Parser error: ${dispParserMsg(msg)}`, "error"));
        } else {
          Nodes.loadFileStatusContainer.append(makeStatusBox(`Parser warning: ${dispParserMsg(msg)}`, "warning"));
        }
      });
    }
  };
  const fileChanged = (file: File | null) => {
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
  };

  const dropHandler = (e: DragEvent) => {
    if (e.dataTransfer === null) return;
    e.preventDefault();
    const files = [...e.dataTransfer.items].map((item) => item.getAsFile()).filter((file) => file !== null);
    fileChanged(files[0]);
  };
  Nodes.loadFileDropZone.addEventListener("drop", (e) => {
    dropHandler(e as DragEvent);
  });
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

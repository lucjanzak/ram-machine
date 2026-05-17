import { showLoadDialog } from "./LoadFile";
import { t } from "./Localization";
import { Dialogs, Nodes } from "./Nodes";
import { PaneName } from "./Panes";
import { showSaveDialog, updateSaveDataPreview } from "./SaveFile";
import { preferences } from "./Settings";

export function initNavDOM() {
  Nodes.newProgramButton.addEventListener("click", () => {
    window.RAMMachine.machine.loadAssemblyAndReset("");
  });
  Nodes.loadProgramButton.addEventListener("click", () => {
    showLoadDialog();
  });
  Nodes.saveProgramButton.addEventListener("click", () => {
    showSaveDialog();
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
    Dialogs.about.showModal();
  });
  Object.entries(Nodes.viewButtons).forEach(([key, button]) => {
    button.addEventListener("click", () => {
      const pane = key as PaneName;
      preferences.setPaneVisibility(pane, !preferences.getPaneVisibility(pane));
      preferences.saveToLocalStorage();
    });
  });
}

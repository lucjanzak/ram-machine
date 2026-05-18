import { Chart, ScaleOptions } from "chart.js/auto";
import { Dialogs, Nodes } from "./Nodes";
import { Machine } from "./Machine";
import { assertNever, unwrap } from "./Util";
import annotationPlugin from "chartjs-plugin-annotation";
import { t } from "./Localization";
import { createSimulationInputTape, InputTape, valuesFromString } from "./InputTape";
import { preferences } from "./Settings";
Chart.register(annotationPlugin);

export type DataPoint = {
  n: number;
  memoryComplexity: number | undefined;
  memoryComplexityLog: number | undefined;
  timeComplexity: number | undefined;
  timeComplexityLog: number | undefined;
  realTime: number;
};

export type FunctionType =
  | "none"
  | "constant"
  | "linear"
  | "quadratic"
  | "cubic"
  | "quartic"
  | "logarithmic"
  | "linearLogarithmic"
  | "quadraticLogarithmic";

export type SimulationType = InputDataSettings["simulationType"];
export type SequenceType = Sequence["type"];
export type ValueType = "oneValueSingle" | "oneValueEndless";
export type Sequence =
  | {
      type: "natural" | "positive" | "negative" | "prime" | "composite";
    }
  | {
      type: "constant";
      value: bigint;
    }
  | {
      type: "arithmetic" | "geometric";
      from: bigint;
      step: bigint;
    }
  | {
      type: "random";
      minInclusive: bigint;
      maxExclusive: bigint;
    }
  | {
      type: "custom";
      tape: bigint[];
    };

export type InputDataSettings =
  | {
      simulationType: "valueVariable";
      valueType: ValueType;
    }
  | {
      simulationType: "lengthVariable" | "sizedArray";
      sequence: Sequence;
    }
  | {
      simulationType: "customData";
      customData: bigint[][];
    };

export function parseFunctionType(input: FormDataEntryValue | string | null): FunctionType | null {
  if (
    input === "none" ||
    input === "constant" ||
    input === "linear" ||
    input === "quadratic" ||
    input === "cubic" ||
    input === "quartic" ||
    input === "logarithmic" ||
    input === "linearLogarithmic" ||
    input === "quadraticLogarithmic"
  )
    return input;
  return null;
}

export function parseSimulationType(input: FormDataEntryValue | string | null): SimulationType | null {
  if (input === "valueVariable" || input === "lengthVariable" || input === "sizedArray" || input === "customData")
    return input;
  return null;
}

export function parseSequenceType(input: FormDataEntryValue | string | null): SequenceType | null {
  if (
    input === "natural" ||
    input === "positive" ||
    input === "negative" ||
    input === "constant" ||
    input === "prime" ||
    input === "composite" ||
    input === "arithmetic" ||
    input === "geometric" ||
    input === "random" ||
    input === "custom"
  )
    return input;
  return null;
}

export function parseValueType(input: FormDataEntryValue | string | null): ValueType | null {
  if (input === "oneValueSingle" || input === "oneValueEndless") return input;
  return null;
}

export function parseTape(text: string): bigint[] {
  return valuesFromString(text);
}

export function parseTapeList(text: string): bigint[][] {
  text = text.trim();
  if (text === "") return [];

  const tapeStrings = text.split(/[\r\n;]+/);
  const tapes = tapeStrings
    .map((tapeString) => {
      if (tapeString === "") {
        return undefined;
      }
      return parseTape(tapeString);
    })
    .filter((x) => x !== undefined);
  return tapes;
}

export class ComplexityChart {
  public chart: Chart<"line", (number | undefined)[], number>;
  private currentXPosition = 0n;
  private comparisonFunctionType: FunctionType = "none";
  private comparisonFunctionMultiplier: number = 1;
  private inputDataConfig: InputDataSettings = {
    simulationType: "valueVariable",
    valueType: "oneValueSingle",
  };

  private genScales(): {
    [key: string]: ScaleOptions<"linear">;
  } {
    return {
      complexityScale: {
        type: "linear",
        position: "left",
      },
      realTimeScale: {
        type: "linear",
        display: this.showRealTimeAxis,
        position: "right",
        title: {
          display: true,
          text: t.chartScreen.chart.realTimeAxis,
        },
        ticks: {
          callback: (value) => `${value}${t.chartScreen.chart.realTimeAxisUnits}`,
        },
        grid: {
          display: false,
        },
      },
    };
  }

  // TODO(optional): define a type of this
  private genAnnotations(): any {
    return {
      timeoutThreshold: {
        adjustScaleRange: false,
        display: this.showRealTimeAxis,
        type: "line",
        scaleID: "realTimeScale",
        value: this.timeoutMs,
        endValue: this.timeoutMs,
        borderColor: "red",
        borderDash: [10, 3],
        borderWidth: 2,
        label: {
          display: true,
          content: "Timeout",
          yAdjust: -20,
        },
      },
    };
  }

  constructor(private timeoutMs: number, private showRealTimeAxis: boolean, data: DataPoint[] = []) {
    this.chart = new Chart(Nodes.chartCanvas, {
      type: "line",
      data: {
        labels: data.map((row) => row.n),
        datasets: [
          {
            label: t.chartScreen.chart.legend.memoryComplexity,
            data: data.map((row) => row.memoryComplexity),
            yAxisID: "complexityScale",
          },
          {
            label: t.chartScreen.chart.legend.memoryComplexityLog,
            data: data.map((row) => row.memoryComplexityLog),
            yAxisID: "complexityScale",
          },
          {
            label: t.chartScreen.chart.legend.timeComplexity,
            data: data.map((row) => row.timeComplexity),
            yAxisID: "complexityScale",
          },
          {
            label: t.chartScreen.chart.legend.timeComplexityLog,
            data: data.map((row) => row.timeComplexityLog),
            yAxisID: "complexityScale",
          },
          {
            label: t.chartScreen.chart.legend.realTime,
            data: data.map((row) => row.realTime),
            yAxisID: "realTimeScale",
            hidden: !this.showRealTimeAxis,
          },
          {
            label: t.chartScreen.chart.legend.comparisonFunction,
            data: data.map((row) => this.comparisonFn(row.n)),
            yAxisID: "complexityScale",
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        scales: this.genScales(),
        plugins: {
          annotation: {
            annotations: this.genAnnotations(),
          },
        },
      },
    });

    this.setAnimationsEnabled(preferences.getAnimationsEnabled());
  }

  setAnimationsEnabled(enabled: boolean) {
    const activeTransition = this.chart.options.transitions?.active?.animation;
    if (activeTransition !== undefined) {
      activeTransition.duration = enabled ? 500 : 0;
      activeTransition.easing = "easeOutExpo";
    }
    const animation = this.chart.options.animation;
    if (animation !== false && animation !== undefined) {
      animation.duration = enabled ? 500 : 0;
      animation.easing = "easeOutExpo";
    }
  }

  changeRealTimeAxisVisibility(displayRealTime: boolean) {
    this.showRealTimeAxis = displayRealTime;
    this.chart.options.scales = this.genScales();
    unwrap(this.chart.options.plugins?.annotation).annotations = this.genAnnotations();
    this.chart.setDatasetVisibility(4, displayRealTime);
    this.chart.update("active");
  }

  changeTimeoutMs(timeoutMs: number) {
    this.timeoutMs = timeoutMs;
    unwrap(this.chart.options.plugins?.annotation).annotations = this.genAnnotations();
    this.chart.update();
  }

  updateChart() {
    this.chart.update();
  }

  comparisonFn(n: number): number | undefined {
    const functions: { [K in FunctionType]: (n: number) => number | undefined } = {
      none: (_n: number) => undefined,
      constant: (_n: number) => 1,
      linear: (n: number) => n,
      quadratic: (n: number) => n * n,
      cubic: (n: number) => n * n * n,
      quartic: (n: number) => n * n * n * n,
      logarithmic: (n: number) => Math.log2(n),
      linearLogarithmic: (n: number) => n * Math.log2(n),
      quadraticLogarithmic: (n: number) => n * n * Math.log2(n),
    };
    const value = functions[this.comparisonFunctionType](n);
    if (value === undefined) {
      return undefined;
    } else {
      return this.comparisonFunctionMultiplier * value;
    }
  }

  changeComparisonFunction(type: FunctionType, multiplier: number) {
    this.comparisonFunctionType = type;
    this.comparisonFunctionMultiplier = multiplier;
    const array: (number | undefined)[] = [];
    this.chart.data.labels?.forEach((n) => {
      array.push(this.comparisonFn(n));
    });
    this.chart.data.datasets[5].data = array;
    this.chart.update();
  }

  changedInputDataConfig() {
    [
      Nodes.inputDataValueLabel,
      Nodes.inputDataSequenceLabel,
      Nodes.inputDataCustomLabel,
      Nodes.inputDataValueSelect,
      Nodes.inputDataSequenceSelect,
      Nodes.inputDataCustom,
      Nodes.inputDataSequenceConstLabel,
      Nodes.inputDataSequenceConst,
      Nodes.inputDataSequenceStartLabel,
      Nodes.inputDataSequenceStart,
      Nodes.inputDataSequenceStepLabel,
      Nodes.inputDataSequenceStep,
      Nodes.inputDataSequenceRandomMinLabel,
      Nodes.inputDataSequenceRandomMin,
      Nodes.inputDataSequenceRandomMaxLabel,
      Nodes.inputDataSequenceRandomMax,
      Nodes.inputDataSequenceCustomLabel,
      Nodes.inputDataSequenceCustom,
    ].forEach((x) => x.classList.add("hidden"));

    const simulationType = unwrap(parseSimulationType(Nodes.simulationTypeSelect.value));
    if (simulationType === "valueVariable") {
      Nodes.inputDataValueLabel.classList.remove("hidden");
      Nodes.inputDataValueSelect.classList.remove("hidden");
      this.inputDataConfig = {
        simulationType,
        valueType: unwrap(parseValueType(Nodes.inputDataValueSelect.value)),
      };
    } else if (simulationType === "lengthVariable" || simulationType === "sizedArray") {
      Nodes.inputDataSequenceLabel.classList.remove("hidden");
      Nodes.inputDataSequenceSelect.classList.remove("hidden");
      const sequenceType = unwrap(parseSequenceType(Nodes.inputDataSequenceSelect.value));
      if (
        sequenceType === "natural" ||
        sequenceType === "positive" ||
        sequenceType === "negative" ||
        sequenceType === "prime" ||
        sequenceType === "composite"
      ) {
        this.inputDataConfig = {
          simulationType,
          sequence: { type: sequenceType },
        };
      } else if (sequenceType === "constant") {
        Nodes.inputDataSequenceConstLabel.classList.remove("hidden");
        Nodes.inputDataSequenceConst.classList.remove("hidden");
        this.inputDataConfig = {
          simulationType,
          sequence: {
            type: sequenceType,
            value: BigInt(Nodes.inputDataSequenceConst.valueAsNumber),
          },
        };
      } else if (sequenceType === "arithmetic" || sequenceType === "geometric") {
        Nodes.inputDataSequenceStartLabel.classList.remove("hidden");
        Nodes.inputDataSequenceStart.classList.remove("hidden");
        Nodes.inputDataSequenceStepLabel.classList.remove("hidden");
        Nodes.inputDataSequenceStep.classList.remove("hidden");
        this.inputDataConfig = {
          simulationType,
          sequence: {
            type: sequenceType,
            from: BigInt(Nodes.inputDataSequenceStart.valueAsNumber),
            step: BigInt(Nodes.inputDataSequenceStep.valueAsNumber),
          },
        };
      } else if (sequenceType === "random") {
        Nodes.inputDataSequenceRandomMinLabel.classList.remove("hidden");
        Nodes.inputDataSequenceRandomMin.classList.remove("hidden");
        Nodes.inputDataSequenceRandomMaxLabel.classList.remove("hidden");
        Nodes.inputDataSequenceRandomMax.classList.remove("hidden");
        this.inputDataConfig = {
          simulationType,
          sequence: {
            type: sequenceType,
            minInclusive: BigInt(Nodes.inputDataSequenceRandomMin.valueAsNumber),
            maxExclusive: BigInt(Nodes.inputDataSequenceRandomMax.valueAsNumber),
          },
        };
      } else if (sequenceType === "custom") {
        Nodes.inputDataSequenceCustomLabel.classList.remove("hidden");
        Nodes.inputDataSequenceCustom.classList.remove("hidden");
        this.inputDataConfig = {
          simulationType,
          sequence: {
            type: sequenceType,
            tape: parseTape(Nodes.inputDataSequenceCustom.value),
          },
        };
      }
    } else if (simulationType === "customData") {
      Nodes.inputDataCustomLabel.classList.remove("hidden");
      Nodes.inputDataCustom.classList.remove("hidden");
      this.inputDataConfig = {
        simulationType,
        customData: parseTapeList(Nodes.inputDataCustom.value),
      };
    } else {
      assertNever(simulationType);
    }

    const preview = [...Array(15).keys()].map((i) => {
      const x = BigInt(i + 1);
      return {
        x,
        tape: createSimulationInputTape(x, this.inputDataConfig),
      };
    });

    console.log("Simulation input data preview:", this.inputDataConfig, preview);
    Nodes.inputDataPreview.value =
      preview
        .map(({ x, tape }) => {
          const tapeString = tape.asString(10);
          for (let i = 0; i < 10; i++) {
            tape.read(true);
          }
          const finished = tape.read(true) === undefined;
          return finished ? `n = ${x}: ${tapeString}` : `n = ${x}: ${tapeString}...`;
        })
        .join("\n") + "\n...";
    this.clearDataAndUpdate();
  }

  addDataPointWithoutUpdate(dataPoint: DataPoint) {
    this.chart.data.labels?.push(dataPoint.n);
    this.chart.data.datasets[0].data.push(dataPoint.memoryComplexity);
    this.chart.data.datasets[1].data.push(dataPoint.memoryComplexityLog);
    this.chart.data.datasets[2].data.push(dataPoint.timeComplexity);
    this.chart.data.datasets[3].data.push(dataPoint.timeComplexityLog);
    this.chart.data.datasets[4].data.push(dataPoint.realTime);
    this.chart.data.datasets[5].data.push(this.comparisonFn(dataPoint.n));
  }

  clearDataAndUpdate() {
    this.currentXPosition = 0n;
    this.chart.data.labels = [];
    this.chart.data.datasets.forEach((dataset) => {
      dataset.data = [];
    });
    this.chart.update();
  }

  generateMorePoints(newPointsToGenerate: number) {
    const startTime = Date.now();
    const loopTimeout = 3000;
    for (let i = 0; i < newPointsToGenerate; i++) {
      const timePassed = Date.now() - startTime;
      if (timePassed > loopTimeout) {
        console.warn(`Could not generate all desired points - the process was taking more than ${loopTimeout}ms`);
        break;
      }

      this.currentXPosition++;
      const inputTape = createSimulationInputTape(this.currentXPosition, this.inputDataConfig);
      // console.log(inputTape);
      const machine = Machine.runSimulation(window.RAMMachine.machine.getProgram(), inputTape, {
        timeout: this.timeoutMs,
      });
      // console.log(inputData, machine);
      if (machine.getStopReason() !== "halt") {
        this.addDataPointWithoutUpdate({
          n: Number(this.currentXPosition),
          memoryComplexity: undefined,
          memoryComplexityLog: undefined,
          timeComplexity: undefined,
          timeComplexityLog: undefined,
          realTime: machine.stats.fetchRealTime(),
        });
      } else {
        this.addDataPointWithoutUpdate(machine.stats.asDataPoint(this.currentXPosition));
      }
      // this.updateChart();
    }

    this.updateChart();
  }
}

export function initChart(): ComplexityChart {
  return new ComplexityChart(Nodes.executionTimeoutInput.valueAsNumber, Nodes.toggleRealTimeAxis.checked);
}

export function initChartDOM() {
  // Input tape config
  [
    Nodes.simulationTypeSelect,
    Nodes.inputDataValueSelect,
    Nodes.inputDataSequenceSelect,
    Nodes.inputDataCustom,
    Nodes.inputDataSequenceConst,
    Nodes.inputDataSequenceStart,
    Nodes.inputDataSequenceStep,
    Nodes.inputDataSequenceRandomMin,
    Nodes.inputDataSequenceRandomMax,
    Nodes.inputDataSequenceCustom,
  ].forEach((x) =>
    x.addEventListener("change", () => {
      window.RAMMachine.chart.changedInputDataConfig();
    })
  );
  window.RAMMachine.chart.changedInputDataConfig();

  // Generate button
  Nodes.generatePointsButton.addEventListener("click", () => {
    const newPointsToGenerate = Nodes.generatePointsInput.valueAsNumber;
    window.RAMMachine.chart.generateMorePoints(newPointsToGenerate);
  });

  // Comparison function inputs
  Nodes.comparisonFunctionMultiplierInput.addEventListener("change", () => {
    window.RAMMachine.chart.changeComparisonFunction(
      unwrap(parseFunctionType(Nodes.comparisonFunctionSelect.value)),
      Nodes.comparisonFunctionMultiplierInput.valueAsNumber
    );
  });
  Nodes.comparisonFunctionSelect.addEventListener("change", () => {
    window.RAMMachine.chart.changeComparisonFunction(
      unwrap(parseFunctionType(Nodes.comparisonFunctionSelect.value)),
      Nodes.comparisonFunctionMultiplierInput.valueAsNumber
    );
  });
  window.RAMMachine.chart.changeComparisonFunction(
    unwrap(parseFunctionType(Nodes.comparisonFunctionSelect.value)),
    Nodes.comparisonFunctionMultiplierInput.valueAsNumber
  );

  // Real-time settings
  Nodes.executionTimeoutInput.addEventListener("change", () => {
    window.RAMMachine.chart.changeTimeoutMs(Nodes.executionTimeoutInput.valueAsNumber);
  });
  Nodes.toggleRealTimeAxis.addEventListener("change", () => {
    window.RAMMachine.chart.changeRealTimeAxisVisibility(Nodes.toggleRealTimeAxis.checked);
  });

  // Reset / clear / close
  Nodes.chartSettingsForm.addEventListener("reset", () => {
    window.RAMMachine.chart.changeTimeoutMs(parseInt(Nodes.executionTimeoutInput.defaultValue));
    window.RAMMachine.chart.changeRealTimeAxisVisibility(Nodes.toggleRealTimeAxis.defaultChecked);

    // TODO(hack): fix this hack
    // This has to be slightly delayed, because the .value of fields is still intact and not yet reset to defaults
    setTimeout(() => {
      window.RAMMachine.chart.changeComparisonFunction(
        unwrap(parseFunctionType(Nodes.comparisonFunctionSelect.value)),
        parseInt(Nodes.comparisonFunctionMultiplierInput.defaultValue)
      );
      window.RAMMachine.chart.changedInputDataConfig();
    });
  });
  Nodes.clearChartButton.addEventListener("click", () => {
    window.RAMMachine.chart.clearDataAndUpdate();
  });
  Nodes.closeChartButton.addEventListener("click", () => {
    Dialogs.chartWindow.close();
  });
}

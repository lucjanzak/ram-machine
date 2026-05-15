import { Chart, ScaleOptions } from "chart.js/auto";
import { Dialogs, Nodes } from "./Nodes";
import { Machine } from "./Machine";
import { unwrap } from "./Util";
import annotationPlugin from "chartjs-plugin-annotation";
import { t } from "./Localization";
import { createSimulationInputTape } from "./InputTape";
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
  | "linear_logarithmic"
  | "quadratic_logarithmic";

function parseFunctionType(input: FormDataEntryValue | string | null): FunctionType | null {
  if (
    input === "none" ||
    input === "constant" ||
    input === "linear" ||
    input === "quadratic" ||
    input === "cubic" ||
    input === "quartic" ||
    input === "logarithmic" ||
    input === "linear_logarithmic" ||
    input === "quadratic_logarithmic"
  )
    return input;
  return null;
}

export class ComplexityChart {
  public chart: Chart<"line", (number | undefined)[], number>;
  private currentXPosition = 0n;
  private comparisonFunctionType: FunctionType = "none";
  private comparisonFunctionMultiplier: number = 1;

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
      activeTransition.duration = enabled ? 200 : 0;
      activeTransition.easing = "easeOutExpo";
    }
    const animation = this.chart.options.animation;
    if (animation !== false && animation !== undefined) {
      animation.duration = enabled ? 200 : 0;
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
      linear_logarithmic: (n: number) => n * Math.log2(n),
      quadratic_logarithmic: (n: number) => n * n * Math.log2(n),
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
      // TODO: make it possible to put the sequence (of prime numbers for example) as a singlevalue sequence.
      // TODO: make it possible to change sequences
      const inputTape = createSimulationInputTape(this.currentXPosition, { type: "positive" });
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
  Nodes.generatePointsButton.addEventListener("click", () => {
    const newPointsToGenerate = Nodes.generatePointsInput.valueAsNumber;
    window.RAMMachine.chart.generateMorePoints(newPointsToGenerate);
  });
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
  Nodes.executionTimeoutInput.addEventListener("change", () => {
    window.RAMMachine.chart.changeTimeoutMs(Nodes.executionTimeoutInput.valueAsNumber);
  });
  Nodes.toggleRealTimeAxis.addEventListener("change", () => {
    window.RAMMachine.chart.changeRealTimeAxisVisibility(Nodes.toggleRealTimeAxis.checked);
  });
  Nodes.chartSettingsForm.addEventListener("reset", () => {
    window.RAMMachine.chart.changeTimeoutMs(parseInt(Nodes.executionTimeoutInput.defaultValue));
    window.RAMMachine.chart.changeRealTimeAxisVisibility(Nodes.toggleRealTimeAxis.defaultChecked);
    window.RAMMachine.chart.changeComparisonFunction(
      unwrap(parseFunctionType(Nodes.comparisonFunctionSelect.value)),
      parseInt(Nodes.comparisonFunctionMultiplierInput.defaultValue)
    );
  });
  Nodes.clearChartButton.addEventListener("click", () => {
    window.RAMMachine.chart.clearDataAndUpdate();
  });
  Nodes.closeChartButton.addEventListener("click", () => {
    Dialogs.chartWindow.close();
  });
}

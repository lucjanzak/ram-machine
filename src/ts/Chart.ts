import { Chart, ScaleOptions } from "chart.js/auto";
import { Dialogs, Nodes } from "./Nodes";
import { Machine } from "./Machine";
import { assertNever, unwrap } from "./Util";
import annotationPlugin from "chartjs-plugin-annotation";
import { t } from "./Localization";
Chart.register(annotationPlugin);

function createSimulationInputData(
  n: bigint,
  sequence: "natural" | "positive" | "singleValue" | "constant",
): bigint[] {
  if (sequence === "natural") {
    let naturalNumbers = [];
    for (let i = 0n; i < n; i++) {
      naturalNumbers.push(i);
    }
    return naturalNumbers;
  } else if (sequence === "positive") {
    let positiveNumbers = [];
    for (let i = 1n; i <= n; i++) {
      positiveNumbers.push(i);
    }
    return positiveNumbers;
  } else if (sequence === "singleValue") {
    return [n];
  } else if (sequence === "constant") {
    return Array(1000).fill(n);
  } else {
    assertNever(sequence);
  }
}

export type DataPoint = {
  n: number;
  memoryComplexity: number | undefined;
  memoryComplexityLog: number | undefined;
  timeComplexity: number | undefined;
  timeComplexityLog: number | undefined;
  realTime: number;
};

export class ComplexityChart {
  public chart: Chart<"line", (number | undefined)[], number>;
  private currentXPosition = 0n;

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
          text: t.chartScreen.chart.realTimeAxis
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

  // TODO: define a type of this
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

  constructor(
    private timeoutMs: number,
    private showRealTimeAxis: boolean,
    data: DataPoint[] = [],
  ) {
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
  }
  

  changeRealTimeAxisVisibility(displayRealTime: boolean) {
    this.showRealTimeAxis = displayRealTime;
    this.chart.options.scales = this.genScales();
    unwrap(this.chart.options.plugins?.annotation).annotations = this.genAnnotations();
    this.chart.setDatasetVisibility(4, displayRealTime);
    this.chart.update();
  }
  

  changeTimeoutMs(timeoutMs: number) {
    this.timeoutMs = timeoutMs;
    unwrap(this.chart.options.plugins?.annotation).annotations = this.genAnnotations();
    this.chart.update();
  }

  updateChart() {
    this.chart.update();
  }

  addDataPointWithoutUpdate(dataPoint: DataPoint) {
    this.chart.data.labels?.push(dataPoint.n);
    this.chart.data.datasets[0].data.push(dataPoint.memoryComplexity);
    this.chart.data.datasets[1].data.push(dataPoint.memoryComplexityLog);
    this.chart.data.datasets[2].data.push(dataPoint.timeComplexity);
    this.chart.data.datasets[3].data.push(dataPoint.timeComplexityLog);
    this.chart.data.datasets[4].data.push(dataPoint.realTime);
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
        console.warn(
          `Could not generate all desired points - the process was taking more than ${loopTimeout}ms`,
        );
        break;
      }

      this.currentXPosition++;
      const inputData = createSimulationInputData(
        this.currentXPosition,
        "singleValue",
      );
      const machine = Machine.runSimulation(
        window.RAMMachine.machine.getProgram(),
        inputData,
        { timeout: this.timeoutMs },
      );
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
        this.addDataPointWithoutUpdate(
          machine.stats.asDataPoint(this.currentXPosition),
        );
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
  Nodes.executionTimeoutInput.addEventListener("change", () => {
    window.RAMMachine.chart.changeTimeoutMs(Nodes.executionTimeoutInput.valueAsNumber);
  });
  Nodes.toggleRealTimeAxis.addEventListener("change", () => {
    window.RAMMachine.chart.changeRealTimeAxisVisibility(Nodes.toggleRealTimeAxis.checked);
  });
  Nodes.chartSettingsForm.addEventListener("reset", () => {
    window.RAMMachine.chart.changeTimeoutMs(parseInt(Nodes.executionTimeoutInput.defaultValue));
    window.RAMMachine.chart.changeRealTimeAxisVisibility(Nodes.toggleRealTimeAxis.defaultChecked);
  });
  Nodes.clearChartButton.addEventListener("click", () => {
    window.RAMMachine.chart.clearDataAndUpdate();
  });
  Nodes.closeChartButton.addEventListener("click", () => {
    Dialogs.chartWindow.close();
  });
}

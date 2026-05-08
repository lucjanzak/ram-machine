import { Chart } from "chart.js/auto";
import { Dialogs, Nodes } from "./Nodes";
import { Machine } from "./Machine";
import { assertNever, unwrap } from "./Util";
import annotationPlugin from 'chartjs-plugin-annotation';
Chart.register(annotationPlugin);

export type DataPoint = {
  n: number,
  memoryComplexity: number | undefined,
  memoryComplexityLog: number | undefined,
  timeComplexity: number | undefined,
  timeComplexityLog: number | undefined,
  realTime: number,
};

function initChart(data: DataPoint[], timeoutMs: number, displayRealTime: boolean) {
  currentTimeoutMs = timeoutMs;
  window.RAMMachine.chart = new Chart(
    Nodes.chartCanvas,
    {
      type: "line",
      data: {
        labels: data.map(row => row.n),
        datasets: [
          {
            label: "Memory complexity",
            data: data.map(row => row.memoryComplexity),
            yAxisID: "complexityScale"
          },
          {
            label: "Memory complexity (log)",
            data: data.map(row => row.memoryComplexityLog),
            yAxisID: "complexityScale"
          },
          {
            label: "Time complexity",
            data: data.map(row => row.timeComplexity),
            yAxisID: "complexityScale"
          },
          {
            label: "Time complexity (log)",
            data: data.map(row => row.timeComplexityLog),
            yAxisID: "complexityScale"
          },
          {
            label: "Real time (ms)",
            data: data.map(row => row.realTime),
            yAxisID: "realTimeScale",
            hidden: !displayRealTime
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        scales: {
          complexityScale: {
            type: "linear",
            position: "left"
          },
          realTimeScale: {
            type: "linear",
            display: displayRealTime,
            position: "right",
            title: {
              display: true,
              text: "Real Time (ms)",
            },
            ticks: {
              callback: (value) => `${value} ms`
            },
            grid: {
              display: false
            }
          }
        },
        plugins: {
          annotation: {
            annotations: {
              timeoutThreshold: {
                adjustScaleRange: false,
                display: displayRealTime,
                type: "line",
                scaleID: "realTimeScale",
                value: timeoutMs,
                endValue: timeoutMs,
                borderColor: "red",
                borderDash: [10, 3],
                borderWidth: 2,
                label: {
                  display: true,
                  content: "Timeout",
                  yAdjust: -20,
                }
              }
            }
          }
        }
      }
    }
  );
}

export function addDataPointWithoutUpdate(dataPoint: DataPoint) {
  const chart = window.RAMMachine.chart;
  if (chart === null) return;
  chart.data.labels?.push(dataPoint.n);
  chart.data.datasets[0].data.push(dataPoint.memoryComplexity);
  chart.data.datasets[1].data.push(dataPoint.memoryComplexityLog);
  chart.data.datasets[2].data.push(dataPoint.timeComplexity);
  chart.data.datasets[3].data.push(dataPoint.timeComplexityLog);
  chart.data.datasets[4].data.push(dataPoint.realTime);
}

export function updateChart() {
  const chart = window.RAMMachine.chart;
  if (chart === null) return;
  chart.update();
}

let currentTimeoutMs = 0;
function changeRealTimeAxisVisibility(displayRealTime: boolean) {
  const chart = window.RAMMachine.chart;
  if (chart === null) return;
  chart.options.scales = {
    complexityScale: {
      type: "linear",
      position: "left"
    },
    realTimeScale: {
      type: "linear",
      display: displayRealTime,
      position: "right",
      title: {
        display: true,
        text: "Real Time (ms)",
      },
      ticks: {
        callback: (value) => `${value} ms`
      },
      grid: {
        display: false
      }
    }
  };
  unwrap(chart.options.plugins?.annotation).annotations = {
  timeoutThreshold: {
    adjustScaleRange: false,
    display: displayRealTime,
    type: "line",
    scaleID: "realTimeScale",
    value: currentTimeoutMs,
    endValue: currentTimeoutMs,
    borderColor: "red",
    borderDash: [10, 3],
    borderWidth: 2,
    label: {
      display: true,
      content: "Timeout",
      yAdjust: -20,
    }
  }};
  chart.setDatasetVisibility(4, displayRealTime);
  chart.update();
}

function createSimulationInputData(n: bigint, sequence: "natural" | "positive" | "singleValue" | "constant"): bigint[] {
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

let howManyDataPoints = 0n;
export function initChartDOM() {
  initChart([], 100, false);
  Nodes.generatePointsButton.addEventListener("click", () => {
    const newPointsToGenerate = Nodes.generatePointsInput.valueAsNumber;
    const startTime = Date.now();
    const loopTimeout = 3000;
    for (let i = 0; i < newPointsToGenerate; i++) {
      const timePassed = Date.now() - startTime;
      if (timePassed > loopTimeout) {
        console.warn(`Could not generate all desired points - the process was taking more than ${loopTimeout}ms`)
        break;
      }


      howManyDataPoints++;
      const inputData = createSimulationInputData(howManyDataPoints, "singleValue");
      const machine = Machine.runSimulation(window.RAMMachine.machine.getProgram(), inputData, { timeout: 100 });
      // console.log(inputData, machine);
      if (machine.getStopReason() !== "halt") {
        addDataPointWithoutUpdate({
          n: Number(howManyDataPoints),
          memoryComplexity: undefined,
          memoryComplexityLog: undefined,
          timeComplexity: undefined,
          timeComplexityLog: undefined,
          realTime: machine.stats.fetchRealTime(),
        });
      } else {
        addDataPointWithoutUpdate(machine.stats.asDataPoint(howManyDataPoints));
      }
    }
    updateChart();
  });
  Nodes.toggleRealTimeAxis.addEventListener("change", () => {
    changeRealTimeAxisVisibility(Nodes.toggleRealTimeAxis.checked);
  });
  Nodes.closeChartButton.addEventListener("click", () => {
    Dialogs.chartWindow.close();
  });
}

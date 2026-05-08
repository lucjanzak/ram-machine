import { unwrap } from "./Util";

export class Timer {

  private state: "stopped" | "running" | "paused" = "stopped";
  private startTime: DOMHighResTimeStamp | null = null;
  private endTime: DOMHighResTimeStamp | null = null;
  private pauseStartTime: DOMHighResTimeStamp | null = null;
  private totalPauseDuration: number = 0;

  reset() {
    this.state = "stopped";
    this.startTime = null;
    this.endTime = null;
    this.pauseStartTime = null;
    this.totalPauseDuration = 0;
  }

  start(currentTime: DOMHighResTimeStamp = performance.now()) {
    this.reset();
    this.startTime = currentTime;
    this.state = "running";
  }

  stop(currentTime: DOMHighResTimeStamp = performance.now()) {
    if (this.state === "paused") {
      this.resume(currentTime);
    }
    if (this.state === "running") {
      this.endTime = currentTime;
      this.state = "stopped";
    }
  }

  pause(currentTime: DOMHighResTimeStamp = performance.now()) {
    if (this.state === "running") {
      this.pauseStartTime = currentTime;
      this.state = "paused";
    }
  }

  resume(currentTime: DOMHighResTimeStamp = performance.now()) {
    if (this.state === "stopped") {
      this.start(currentTime);
    } else if (this.state === "paused") {
      this.totalPauseDuration += currentTime - unwrap(this.pauseStartTime);
      this.pauseStartTime = null;
      this.state = "running";
    }
  }

  time(currentTime: DOMHighResTimeStamp = performance.now()): number {
    const ms = (this.endTime ?? this.pauseStartTime ?? currentTime) - (this.startTime ?? currentTime) - this.totalPauseDuration;
    // console.log(ms);
    return ms;
  }
  
}
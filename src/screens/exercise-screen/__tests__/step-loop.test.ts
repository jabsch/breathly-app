import { loopSteps } from "../step-loop";

let nowMs = 0;
const now = () => nowMs;

const advance = (ms: number) => {
  nowMs += ms;
  jest.advanceTimersByTime(ms);
};

beforeEach(() => {
  jest.useFakeTimers();
  nowMs = 0;
});

afterEach(() => {
  jest.useRealTimers();
});

describe("loopSteps", () => {
  it("starts each step when the previous one ends, and wraps around", () => {
    const started: number[] = [];
    loopSteps([4000, 7000, 8000], (index) => started.push(index), 0, now);

    expect(started).toEqual([0]);
    advance(3999);
    expect(started).toEqual([0]);
    advance(1);
    expect(started).toEqual([0, 1]);
    advance(7000);
    expect(started).toEqual([0, 1, 2]);
    advance(8000);
    expect(started).toEqual([0, 1, 2, 0]);
  });

  it("starts from the given step", () => {
    const started: number[] = [];
    loopSteps([4000, 7000, 8000], (index) => started.push(index), 2, now);

    advance(8000);
    expect(started).toEqual([2, 0]);
  });

  it("does not drift when the timers fire late", () => {
    const started: number[] = [];
    loopSteps([1000, 1000], (index) => started.push(index), 0, now);

    // The clock runs 300 ms ahead of the timers: each timer fires late.
    nowMs += 300;
    advance(1000);
    expect(started).toEqual([0, 1]);
    // The second step ends at 2000 ms on the clock, whatever the late first firing.
    advance(699);
    expect(started).toEqual([0, 1]);
    advance(1);
    expect(started).toEqual([0, 1, 0]);
  });

  it("skips the steps that a stall slept through", () => {
    const started: number[] = [];
    loopSteps([4000, 7000, 8000], (index) => started.push(index), 0, now);

    // The timer for the end of the inhale fires only 12 seconds in, during the exhale.
    nowMs += 12_000;
    jest.advanceTimersByTime(4000);
    expect(started).toEqual([0, 2]);
    // The exhale still ends on time, 19 seconds in.
    advance(6999);
    expect(started).toEqual([0, 2]);
    advance(1);
    expect(started).toEqual([0, 2, 0]);
  });

  it("stops when cleaned up", () => {
    const started: number[] = [];
    const stop = loopSteps([1000], (index) => started.push(index), 0, now);

    stop();
    advance(5000);
    expect(started).toEqual([0]);
  });

  it("does nothing without a step that takes time", () => {
    const onStepStart = jest.fn();
    loopSteps([], onStepStart, 0, now);
    loopSteps([0, 0], onStepStart, 0, now);

    advance(1000);
    expect(onStepStart).not.toHaveBeenCalled();
  });
});

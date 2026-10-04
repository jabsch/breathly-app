import { getStepSecondsRemaining, runStepSeconds } from "../step-seconds";

describe("step seconds", () => {
  it("counts a step down one number a second", () => {
    expect(getStepSecondsRemaining(4_000)).toEqual([4, 3, 2, 1]);
    expect(getStepSecondsRemaining(7_000)).toEqual([7, 6, 5, 4, 3, 2, 1]);
    // A half second rounds the first number up and keeps the last for what is left.
    expect(getStepSecondsRemaining(5_500)).toEqual([6, 5, 4, 3, 2, 1]);
    expect(getStepSecondsRemaining(0)).toEqual([]);
  });

  it("calls each second on time from the start of the step, and stops when cancelled", () => {
    jest.useFakeTimers();
    let nowMs = 0;
    const now = () => nowMs;
    const calls: Array<[number, number]> = [];

    const cancel = runStepSeconds(4_000, (remaining, index) => calls.push([remaining, index]), now);
    expect(calls).toEqual([[4, 0]]);

    // A timer that fires late does not push the next second back.
    nowMs = 1_300;
    jest.advanceTimersByTime(1_000);
    expect(calls).toEqual([
      [4, 0],
      [3, 1],
    ]);
    nowMs = 2_000;
    jest.advanceTimersByTime(700);
    expect(calls.at(-1)).toEqual([2, 2]);

    cancel();
    nowMs = 5_000;
    jest.advanceTimersByTime(5_000);
    expect(calls).toHaveLength(3);
    jest.useRealTimers();
  });
});

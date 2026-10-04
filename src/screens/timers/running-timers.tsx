import React, { FC } from "react";
import { TimerCard, type CardScope } from "@breathly/screens/timers/timer-card";
import { useSettingsStore } from "@breathly/stores/settings";
import { useTimersStore } from "@breathly/stores/timers";

// The timers that have been started, for the session screen: setting a timer up belongs to the
// home page, but one that runs stays in reach next to the breathing.
export const RunningTimers: FC<{ scope: CardScope }> = ({ scope }) => {
  const experiences = useSettingsStore((state) => state.experiences);
  const timers = useTimersStore((state) => state.timers);
  return (
    <>
      {experiences
        .filter((experience) => experience.kind === "timer" && timers[experience.id] != null)
        .map((experience) => (
          <TimerCard key={experience.id} experience={experience} scope={scope} />
        ))}
    </>
  );
};

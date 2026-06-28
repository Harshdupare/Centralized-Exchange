"use client";

import { useState, useEffect } from "react";

type TimeLeft = { hours: number; minutes: number; seconds: number };

function getNextCutOff(now: Date): Date {
  const year = now.getFullYear();
  const date = now.getDate();
  const month = now.getMonth();
  const h = now.getHours();

  if (h < 8) {
    return new Date(year, month, date, 8, 0, 0);
  } else if (h < 16) {
    return new Date(year, month, date, 16, 0, 0);
  } else {
    return new Date(year, month, date, 0, 0, 0);
  }
}

const useNextCutOffCountdown = (): TimeLeft => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const target = getNextCutOff(now);
      const diff = Math.max(0, target.getTime() - now.getTime());

      const hours = Math.floor(diff / 3_600_000);
      const minutes = Math.floor((diff % 3_600_000) / 60_000);
      const seconds = Math.floor((diff % 60_000) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    }

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);

  }, []);

  return timeLeft;
}

export default useNextCutOffCountdown;

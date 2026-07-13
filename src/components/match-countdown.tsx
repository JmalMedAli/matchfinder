"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface MatchCountdownProps {
  date: string;
  className?: string;
}

function getTimeLeft(target: Date) {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, total: diff };
}

export function MatchCountdown({ date, className = "" }: MatchCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(new Date(date)));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(new Date(date)));
    }, 1000);
    return () => clearInterval(timer);
  }, [date]);

  if (!timeLeft) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
        <Clock className="h-3 w-3" />
        Started
      </span>
    );
  }

  if (timeLeft.days > 0) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium text-primary ${className}`}>
        <Clock className="h-3 w-3" />
        in {timeLeft.days}d {timeLeft.hours}h
      </span>
    );
  }

  if (timeLeft.hours > 0) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium text-primary ${className}`}>
        <Clock className="h-3 w-3" />
        in {timeLeft.hours}h {timeLeft.minutes}m
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium text-amber-500 ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
      in {timeLeft.minutes}m {timeLeft.seconds}s
    </span>
  );
}

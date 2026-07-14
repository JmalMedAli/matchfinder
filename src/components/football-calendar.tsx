"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendarMatches, type CalendarMatch } from "@/hooks/use-calendar-matches";
import { DayDetailSheet } from "@/components/day-detail-sheet";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

interface FootballCalendarProps {
  userId: string | null;
}

export function FootballCalendar({ userId }: FootballCalendarProps) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [direction, setDirection] = useState(0);

  // Calculate date range for API (fetch full visible range)
  const dateRange = useMemo(() => {
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

    const startDate = new Date(currentYear, currentMonth, 1 - firstDay);
    const endDate = new Date(currentYear, currentMonth, 1 - firstDay + totalCells - 1);

    return {
      from: startDate.toISOString().slice(0, 10),
      to: endDate.toISOString().slice(0, 10),
    };
  }, [currentYear, currentMonth]);

  const { data: matches, isPending } = useCalendarMatches(dateRange.from, dateRange.to);

  // Group matches by date
  const matchesByDate = useMemo(() => {
    const map: Record<string, CalendarMatch[]> = {};
    for (const match of matches ?? []) {
      const dateKey = match.date.slice(0, 10);
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(match);
    }
    return map;
  }, [matches]);

  const goToPrevMonth = useCallback(() => {
    setDirection(-1);
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDay(null);
  }, [currentMonth, currentYear]);

  const goToNextMonth = useCallback(() => {
    setDirection(1);
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDay(null);
  }, [currentMonth, currentYear]);

  const goToToday = useCallback(() => {
    const t = new Date();
    setDirection(t.getMonth() > currentMonth || t.getFullYear() > currentYear ? 1 : -1);
    setCurrentYear(t.getFullYear());
    setCurrentMonth(t.getMonth());
    setSelectedDay(t.getDate());
    setSelectedDate(formatDateKey(t.getFullYear(), t.getMonth(), t.getDate()));
  }, [currentMonth, currentYear]);

  const handleDayClick = useCallback((day: number) => {
    const dateKey = formatDateKey(currentYear, currentMonth, day);
    setSelectedDay(day);
    setSelectedDate(dateKey);
  }, [currentYear, currentMonth]);

  // Calendar grid
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const cells = useMemo(() => {
    return Array.from({ length: totalCells }, (_, i) => {
      const dayNum = i - firstDay + 1;
      if (dayNum < 1 || dayNum > daysInMonth) return null;
      return dayNum;
    });
  }, [firstDay, daysInMonth, totalCells]);

  const selectedDayMatches = selectedDate ? (matchesByDate[selectedDate] ?? []) : [];

  // Swipe detection for month navigation
  const [touchStart, setTouchStart] = useState<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToNextMonth();
      else goToPrevMonth();
    }
    setTouchStart(null);
  }

  return (
    <>
      <div
        className="bg-card border rounded-2xl overflow-hidden select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold font-[family-name:var(--font-barlow-condensed)]">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {!isCurrentMonth(currentYear, currentMonth, today) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs font-medium text-primary"
                onClick={goToToday}
              >
                Today
              </Button>
            )}
            <button
              onClick={goToPrevMonth}
              className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNextMonth}
              className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 px-2 mb-1">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 px-2 pb-3 gap-y-0.5">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="h-11" />;
            }

            const dateKey = formatDateKey(currentYear, currentMonth, day);
            const dayMatches = matchesByDate[dateKey] ?? [];
            const isToday = isSameDay(new Date(currentYear, currentMonth, day), today);
            const isSelected = selectedDay === day;
            const hasMatches = dayMatches.length > 0;
            const isOrganizer = dayMatches.some((m) => m.user_relation === "organizer");
            const isJoined = dayMatches.some((m) => m.user_relation === "joined");
            const isPending = dayMatches.some((m) => m.user_relation === "pending");
            const isCompleted = dayMatches.every((m) => m.status === "COMPLETED");

            return (
              <motion.button
                key={dateKey}
                onClick={() => handleDayClick(day)}
                className="relative h-11 flex flex-col items-center justify-center rounded-xl transition-colors"
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                {/* Today ring */}
                {isToday && !isSelected && (
                  <motion.div
                    className="absolute inset-1 rounded-lg border-2 border-primary/40"
                    layoutId="todayRing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}

                {/* Selected background */}
                {isSelected && (
                  <motion.div
                    className="absolute inset-1 rounded-lg bg-primary"
                    layoutId="selectedDay"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  />
                )}

                {/* Day number */}
                <span
                  className={`relative z-10 text-sm font-medium ${
                    isSelected
                      ? "text-primary-foreground"
                      : isToday
                        ? "text-primary font-bold"
                        : "text-foreground"
                  }`}
                >
                  {day}
                </span>

                {/* Match indicators */}
                {hasMatches && (
                  <div className="relative z-10 flex items-center gap-0.5 mt-0.5">
                    {isOrganizer && (
                      <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-amber-300" : "bg-amber-500"}`} />
                    )}
                    {isJoined && (
                      <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-primary"}`} />
                    )}
                    {isPending && (
                      <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-orange-300" : "bg-orange-500"}`} />
                    )}
                    {!isOrganizer && !isJoined && !isPending && (
                      <>
                        {dayMatches.length === 1 ? (
                          <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white/70" : "bg-muted-foreground/40"}`} />
                        ) : (
                          <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white/70" : "bg-muted-foreground/40"}`} />
                        )}
                      </>
                    )}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 px-4 pb-3 border-t border-border/50 pt-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-[9px] text-muted-foreground">Playing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-[9px] text-muted-foreground">Organizing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            <span className="text-[9px] text-muted-foreground">Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            <span className="text-[9px] text-muted-foreground">Available</span>
          </div>
        </div>
      </div>

      {/* Day Detail Sheet */}
      <AnimatePresence>
        {selectedDay !== null && selectedDate && (
          <DayDetailSheet
            date={selectedDate}
            day={selectedDay}
            month={currentMonth}
            year={currentYear}
            matches={selectedDayMatches}
            isPending={isPending}
            userId={userId}
            onClose={() => { setSelectedDay(null); setSelectedDate(null); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function isCurrentMonth(year: number, month: number, date: Date) {
  return year === date.getFullYear() && month === date.getMonth();
}

"use client";

import { useState } from "react";
import type { DailyForecast } from "@/lib/weather";
import { weatherEmoji } from "@/lib/weather";

type Props = {
  days: DailyForecast[];
  selected: string;
  onSelect: (date: string) => void;
};

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const pad = (n: number) => String(n).padStart(2, "0");

/** 月表示のカレンダー。予報がある日だけ選択でき、天気アイコンと最高/最低気温を表示する */
export default function Calendar({ days, selected, onSelect }: Props) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const [y0, m0] = (selected || days[0].date).split("-").map(Number);
  const [view, setView] = useState({ year: y0, month: m0 }); // month: 1〜12

  // 予報の範囲（最初と最後の月）
  const firstKey = days[0].date.slice(0, 7);
  const lastKey = days[days.length - 1].date.slice(0, 7);
  const viewKey = `${view.year}-${pad(view.month)}`;

  const shift = (delta: number) =>
    setView(({ year, month }) => {
      const d = new Date(Date.UTC(year, month - 1 + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
    });

  const firstWeekday = new Date(Date.UTC(view.year, view.month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(view.year, view.month, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-black/5 backdrop-blur dark:bg-slate-800/70 dark:ring-white/10">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={viewKey <= firstKey}
          className="rounded-lg px-3 py-1 text-lg disabled:opacity-25 enabled:hover:bg-black/5 dark:enabled:hover:bg-white/10"
          aria-label="前の月"
        >
          ‹
        </button>
        <h2 className="font-semibold">
          {view.year}年 {view.month}月
        </h2>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={viewKey >= lastKey}
          className="rounded-lg px-3 py-1 text-lg disabled:opacity-25 enabled:hover:bg-black/5 dark:enabled:hover:bg-white/10"
          aria-label="次の月"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEK.map((w, i) => (
          <div
            key={w}
            className={`pb-1 font-medium ${i === 0 ? "text-rose-500" : i === 6 ? "text-sky-500" : "text-slate-500 dark:text-slate-400"}`}
          >
            {w}
          </div>
        ))}

        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />;
          const date = `${viewKey}-${pad(day)}`;
          const fc = byDate.get(date);
          const isSel = date === selected;
          const isToday = date === days[0].date;
          return (
            <button
              key={date}
              type="button"
              disabled={!fc}
              onClick={() => fc && onSelect(date)}
              aria-pressed={isSel}
              aria-label={fc ? `${view.month}月${day}日 ${fc.description}` : `${view.month}月${day}日（予報なし）`}
              className={[
                "flex min-h-16 flex-col items-center justify-start rounded-xl p-1 transition",
                fc ? "cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-900/40" : "text-slate-300 dark:text-slate-600",
                isSel ? "bg-sky-500 text-white hover:bg-sky-500 dark:hover:bg-sky-500" : "",
                isToday && !isSel ? "ring-2 ring-sky-400" : "",
              ].join(" ")}
            >
              <span className="text-sm font-medium">{day}</span>
              {fc && (
                <>
                  <span className="text-lg leading-tight">{weatherEmoji(fc.weatherId, fc.icon)}</span>
                  <span className="text-[10px] leading-tight">
                    <span className={isSel ? "" : "text-rose-500"}>{Math.round(fc.tempMax)}°</span>/
                    <span className={isSel ? "" : "text-sky-600 dark:text-sky-400"}>{Math.round(fc.tempMin)}°</span>
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        ※ 無料 API の予報範囲（今日から約5日間）の日付を選択できます
      </p>
    </div>
  );
}

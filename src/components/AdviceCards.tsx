import { dailyAdvice, type Level } from "@/lib/advice";
import type { DailyForecast } from "@/lib/weather";

const badge: Record<Level, string> = {
  good: "bg-emerald-400/90 text-emerald-950",
  ok: "bg-sky-200/90 text-sky-950",
  caution: "bg-amber-300/90 text-amber-950",
  bad: "bg-rose-400/90 text-rose-950",
};

/** 選んだ日の「洗濯指数」「傘」「服装」アドバイス */
export default function AdviceCards({ day }: { day: DailyForecast }) {
  const items = dailyAdvice(day);
  return (
    <div className="mt-6">
      <h3 className="mb-2 text-sm font-semibold opacity-90">この日のアドバイス</h3>
      <ul className="grid gap-3 sm:grid-cols-3">
        {items.map((a) => (
          <li key={a.title} className="rounded-xl bg-white/15 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs opacity-80">{a.title}</span>
              {a.score !== undefined && <span className="text-xs opacity-80">指数 {a.score}</span>}
            </div>
            <p className="mt-1 flex items-center gap-2">
              <span className="text-2xl" aria-hidden>
                {a.emoji}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-sm font-semibold ${badge[a.level]}`}>{a.label}</span>
            </p>
            <p className="mt-2 text-xs leading-relaxed opacity-90">{a.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

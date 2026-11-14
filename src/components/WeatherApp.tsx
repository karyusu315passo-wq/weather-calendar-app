"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import AdviceCards from "@/components/AdviceCards";
import Calendar from "@/components/Calendar";
import { weatherEmoji, type WeatherResponse } from "@/lib/weather";

const DEFAULT_CITY = "Tokyo";
const STORAGE_KEY = "weather-app:last-city";

const formatDate = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const w = "日月火水木金土"[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}月${d}日（${w}）`;
};

/** 自前の API ルート経由で天気を取得（ブラウザは OpenWeatherMap を直接呼ばない） */
async function fetchWeather(query: string): Promise<WeatherResponse> {
  const res = await fetch(`/api/weather?${query}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "取得に失敗しました");
  return json as WeatherResponse;
}

export default function WeatherApp() {
  const [input, setInput] = useState("");
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 取得結果を state に反映
  const apply = useCallback((p: Promise<WeatherResponse>) => {
    p.then(
      (json) => {
        setData(json);
        setSelected(json.days[0]?.date ?? "");
        setError("");
      },
      (e) => setError(e instanceof Error ? e.message : "取得に失敗しました"),
    ).finally(() => setLoading(false));
  }, []);

  const load = (query: string) => {
    setLoading(true);
    setError("");
    apply(fetchWeather(query));
  };

  // 初回: 前回検索した都市（なければ東京）を表示
  useEffect(() => {
    let city = DEFAULT_CITY;
    try {
      city = localStorage.getItem(STORAGE_KEY) || DEFAULT_CITY;
    } catch {}
    apply(fetchWeather(new URLSearchParams({ city }).toString()));
  }, [apply]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const city = input.trim();
    if (!city) return;
    try {
      localStorage.setItem(STORAGE_KEY, city);
    } catch {}
    load(new URLSearchParams({ city }).toString());
  };

  const onLocate = () => {
    if (!navigator.geolocation) {
      setError("このブラウザは位置情報に対応していません");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        load(
          new URLSearchParams({
            lat: pos.coords.latitude.toFixed(4),
            lon: pos.coords.longitude.toFixed(4),
          }).toString(),
        ),
      () => {
        setLoading(false);
        setError("現在地を取得できませんでした（位置情報の許可を確認してください）");
      },
      { timeout: 10000 },
    );
  };

  const day = data?.days.find((d) => d.date === selected);
  const isToday = data && selected === data.days[0]?.date;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">🌤️ お天気カレンダー</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          都市名か現在地で検索し、カレンダーから日付を選ぶとその日の予報を表示します
        </p>
      </header>

      <form onSubmit={onSearch} className="mb-6 flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="都市名（例: 東京, Osaka, London）"
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-800 dark:focus:ring-sky-900"
          aria-label="都市名"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-sky-500 px-5 py-2.5 font-medium text-white hover:bg-sky-600 disabled:opacity-50 sm:flex-none"
          >
            検索
          </button>
          <button
            type="button"
            onClick={onLocate}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium hover:bg-slate-50 disabled:opacity-50 sm:flex-none dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            📍 現在地
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" className="mb-6 rounded-xl bg-rose-50 px-4 py-3 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading && !data && <p className="text-slate-500">読み込み中…</p>}

      {data && day && (
        <div className={`grid gap-6 lg:grid-cols-[1fr_1.1fr] ${loading ? "opacity-60" : ""}`}>
          {/* key を変えて、都市が変わったらカレンダーの表示月をリセット */}
          <Calendar key={`${data.city.name}-${data.days[0].date}`} days={data.days} selected={selected} onSelect={setSelected} />

          <section className="rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 p-6 text-white shadow-lg">
            <p className="text-sm opacity-90">
              {data.city.name}
              {data.city.country && `, ${data.city.country}`}
            </p>
            <h2 className="text-xl font-semibold">
              {formatDate(day.date)}
              {isToday && <span className="ml-2 rounded-full bg-white/25 px-2 py-0.5 text-xs">今日</span>}
            </h2>

            <div className="mt-4 flex items-center gap-4">
              <span className="text-6xl">
                {isToday ? weatherEmoji(data.current.weatherId, data.current.icon) : weatherEmoji(day.weatherId, day.icon)}
              </span>
              <div>
                {isToday ? (
                  <>
                    <p className="text-5xl font-bold">{Math.round(data.current.temp)}°C</p>
                    <p className="text-sm opacity-90">
                      現在 {data.current.description}・体感 {Math.round(data.current.feelsLike)}°C
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-5xl font-bold">{Math.round(day.tempMax)}°C</p>
                    <p className="text-sm opacity-90">{day.description}</p>
                  </>
                )}
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="最高 / 最低" value={`${Math.round(day.tempMax)}° / ${Math.round(day.tempMin)}°`} />
              <Stat label="湿度" value={`${isToday ? data.current.humidity : day.humidity}%`} />
              <Stat label="降水確率" value={`${day.pop}%`} />
              <Stat label={isToday ? "風速" : "天気"} value={isToday ? `${data.current.windSpeed} m/s` : day.description} />
            </dl>

            <AdviceCards day={day} />

            <h3 className="mt-6 mb-2 text-sm font-semibold opacity-90">3時間ごとの予報</h3>
            <ul className="flex gap-2 overflow-x-auto pb-2">
              {day.hourly.map((h) => (
                <li key={h.time} className="min-w-20 flex-none rounded-xl bg-white/15 p-2 text-center">
                  <p className="text-xs opacity-90">{h.time}</p>
                  <p className="text-2xl" title={h.description}>
                    {weatherEmoji(h.weatherId, h.icon)}
                  </p>
                  <p className="font-semibold">{Math.round(h.temp)}°</p>
                  <p className="text-[11px] opacity-90">☔ {h.pop}%</p>
                  <p className="text-[11px] opacity-90">💧 {h.humidity}%</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <footer className="mt-10 text-center text-xs text-slate-500">
        Weather data provided by{" "}
        <a href="https://openweathermap.org/" className="underline" target="_blank" rel="noreferrer">
          OpenWeather
        </a>
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 p-3">
      <dt className="text-xs opacity-80">{label}</dt>
      <dd className="mt-0.5 truncate font-semibold">{value}</dd>
    </div>
  );
}

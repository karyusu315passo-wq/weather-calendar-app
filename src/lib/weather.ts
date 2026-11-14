// OpenWeatherMap のレスポンスを、画面で扱いやすい形に整形するための型と関数

export type HourlyForecast = {
  time: string; // "HH:mm"（都市の現地時刻）
  temp: number;
  humidity: number;
  pop: number; // 降水確率 0〜100 (%)
  windSpeed: number; // m/s
  description: string;
  weatherId: number;
  icon: string;
};

export type DailyForecast = {
  date: string; // "YYYY-MM-DD"（都市の現地日付）
  tempMin: number;
  tempMax: number;
  humidity: number; // 平均湿度
  pop: number; // その日の最大降水確率
  windSpeed: number; // 平均風速 m/s
  description: string;
  weatherId: number;
  icon: string;
  hourly: HourlyForecast[];
};

export type CurrentWeather = {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  weatherId: number;
  icon: string;
};

export type WeatherResponse = {
  city: { name: string; country: string; timezone: number };
  current: CurrentWeather;
  days: DailyForecast[];
};

// ---- OpenWeatherMap の生レスポンス（使う部分だけ） ----
type OwmWeather = { id: number; description: string; icon: string };

export type OwmCurrent = {
  name: string;
  sys: { country: string };
  timezone: number;
  main: { temp: number; feels_like: number; humidity: number };
  wind: { speed: number };
  weather: OwmWeather[];
};

export type OwmForecast = {
  city: { name: string; country: string; timezone: number };
  list: {
    dt: number;
    main: { temp: number; temp_min: number; temp_max: number; humidity: number };
    weather: OwmWeather[];
    wind?: { speed: number };
    pop: number;
  }[];
};

const pad = (n: number) => String(n).padStart(2, "0");

/** UNIX 秒 + タイムゾーンオフセット(秒) から現地の日付・時刻文字列を作る */
export function toLocalParts(unixSec: number, tzOffsetSec: number) {
  const d = new Date((unixSec + tzOffsetSec) * 1000);
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
    hour: d.getUTCHours(),
  };
}

export function buildWeatherResponse(current: OwmCurrent, forecast: OwmForecast): WeatherResponse {
  const tz = forecast.city.timezone;
  const byDate = new Map<string, { hour: number; item: OwmForecast["list"][number]; time: string }[]>();

  for (const item of forecast.list) {
    const { date, time, hour } = toLocalParts(item.dt, tz);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push({ hour, item, time });
  }

  const days: DailyForecast[] = [...byDate.entries()].map(([date, entries]) => {
    // 代表の天気は「正午に一番近い時間帯」のもの
    const rep = entries.reduce((a, b) => (Math.abs(b.hour - 12) < Math.abs(a.hour - 12) ? b : a));
    const temps = entries.map((e) => e.item.main.temp);
    return {
      date,
      tempMin: Math.min(...entries.map((e) => e.item.main.temp_min), ...temps),
      tempMax: Math.max(...entries.map((e) => e.item.main.temp_max), ...temps),
      humidity: Math.round(entries.reduce((s, e) => s + e.item.main.humidity, 0) / entries.length),
      pop: Math.round(Math.max(...entries.map((e) => e.item.pop)) * 100),
      windSpeed: Math.round((entries.reduce((s, e) => s + (e.item.wind?.speed ?? 0), 0) / entries.length) * 10) / 10,
      description: rep.item.weather[0]?.description ?? "",
      weatherId: rep.item.weather[0]?.id ?? 800,
      icon: rep.item.weather[0]?.icon ?? "01d",
      hourly: entries.map(({ item, time }) => ({
        time,
        temp: item.main.temp,
        humidity: item.main.humidity,
        pop: Math.round(item.pop * 100),
        windSpeed: item.wind?.speed ?? 0,
        description: item.weather[0]?.description ?? "",
        weatherId: item.weather[0]?.id ?? 800,
        icon: item.weather[0]?.icon ?? "01d",
      })),
    };
  });

  return {
    city: { name: current.name || forecast.city.name, country: current.sys.country, timezone: tz },
    current: {
      temp: current.main.temp,
      feelsLike: current.main.feels_like,
      humidity: current.main.humidity,
      windSpeed: current.wind.speed,
      description: current.weather[0]?.description ?? "",
      weatherId: current.weather[0]?.id ?? 800,
      icon: current.weather[0]?.icon ?? "01d",
    },
    days,
  };
}

/** 天気コード → 絵文字 */
export function weatherEmoji(id: number, icon = "d"): string {
  const night = icon.endsWith("n");
  if (id >= 200 && id < 300) return "⛈️";
  if (id >= 300 && id < 400) return "🌦️";
  if (id >= 500 && id < 600) return id === 511 ? "🌨️" : "🌧️";
  if (id >= 600 && id < 700) return "❄️";
  if (id >= 700 && id < 800) return "🌫️";
  if (id === 800) return night ? "🌙" : "☀️";
  if (id === 801) return night ? "☁️" : "🌤️";
  if (id === 802) return "⛅";
  return "☁️";
}

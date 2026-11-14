// 予報データから「洗濯指数」「傘が必要か」「服装」のアドバイスを作る
import type { DailyForecast, HourlyForecast } from "@/lib/weather";

export type Level = "good" | "ok" | "caution" | "bad";

export type Advice = {
  emoji: string;
  title: string;
  label: string; // ひと言（例: よく乾く）
  message: string; // 補足
  level: Level;
  score?: number; // 洗濯指数 0〜100
};

const isRain = (id: number) => id >= 200 && id < 700; // 雷雨・霧雨・雨・雪

/** 日中（6〜18時）の予報。無ければその日の全予報 */
function daytime(day: DailyForecast): HourlyForecast[] {
  const d = day.hourly.filter((h) => {
    const hour = Number(h.time.slice(0, 2));
    return hour >= 6 && hour <= 18;
  });
  return d.length ? d : day.hourly;
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** 洗濯指数: 日中の気温・湿度・風・降水確率から 0〜100 で採点 */
export function laundryAdvice(day: DailyForecast): Advice {
  const hours = daytime(day);
  const maxPop = Math.max(...hours.map((h) => h.pop));
  // 天気が「雨」でも降水確率がごく低い枠は除く（傘の判定と食い違わないように）
  const rainy = hours.some((h) => isRain(h.weatherId) && h.pop >= 30);
  const humidity = avg(hours.map((h) => h.humidity));
  const wind = avg(hours.map((h) => h.windSpeed));
  const temp = Math.max(...hours.map((h) => h.temp));

  const base = 50 + (temp - 15) * 2 - (humidity - 55) * 0.8 + Math.min(wind, 6) * 3 - maxPop * 0.4;
  const score = Math.round(clamp(rainy || maxPop >= 50 ? Math.min(base, 20) : base, 0, 100));

  const windNote = wind >= 8 ? "風が強いので、飛ばされないようにしっかり留めて。" : "";
  if (rainy || maxPop >= 50)
    return { emoji: "👕", title: "洗濯指数", label: "部屋干しがおすすめ", level: "bad", score,
      message: `日中に雨の可能性があります（降水確率 最大${maxPop}%）。` };
  if (score >= 80)
    return { emoji: "👕", title: "洗濯指数", label: "大変よく乾く", level: "good", score,
      message: `厚手の物やシーツもすっきり乾きます。${windNote}` };
  if (score >= 60)
    return { emoji: "👕", title: "洗濯指数", label: "よく乾く", level: "good", score,
      message: `外干し日和です。${windNote}` };
  if (score >= 40)
    return { emoji: "👕", title: "洗濯指数", label: "乾く", level: "ok", score,
      message: `薄手の物なら外干しで乾きます。${windNote}` };
  return { emoji: "👕", title: "洗濯指数", label: "乾きにくい", level: "caution", score,
    message: `湿度が高め（平均${Math.round(humidity)}%）です。部屋干しや乾燥機の併用を。` };
}

/** 傘: 降水確率と天気から判定。雨が降りそうな時間帯も示す */
export function umbrellaAdvice(day: DailyForecast): Advice {
  const maxPop = Math.max(...day.hourly.map((h) => h.pop));
  const rainHours = day.hourly.filter((h) => h.pop >= 50 || isRain(h.weatherId));
  const when = rainHours.length
    ? rainHours.length === day.hourly.length
      ? "一日中"
      : `${rainHours[0].time}〜${rainHours[rainHours.length - 1].time}ごろ`
    : "";

  if (maxPop >= 70 || rainHours.some((h) => isRain(h.weatherId) && h.pop >= 50))
    return { emoji: "☂️", title: "傘", label: "必要", level: "bad",
      message: `${when}に雨の予報です（降水確率 最大${maxPop}%）。` };
  if (maxPop >= 40)
    return { emoji: "🌂", title: "傘", label: "折りたたみ傘があると安心", level: "caution",
      message: `${when ? `${when}に` : ""}にわか雨の可能性があります（最大${maxPop}%）。` };
  if (maxPop >= 20)
    return { emoji: "🌂", title: "傘", label: "たぶん不要", level: "ok",
      message: `降水確率は最大${maxPop}%。念のため空模様に注意を。` };
  return { emoji: "😎", title: "傘", label: "不要", level: "good",
    message: `雨の心配はほとんどありません（最大${maxPop}%）。` };
}

/** 服装: 日中の最高気温を基準に、寒暖差と風も考慮 */
export function clothingAdvice(day: DailyForecast): Advice {
  const hours = daytime(day);
  const high = Math.max(...hours.map((h) => h.temp));
  const low = day.tempMin;
  const wind = Math.max(...day.hourly.map((h) => h.windSpeed));

  const levels: { min: number; emoji: string; label: string; message: string; level: Level }[] = [
    { min: 28, emoji: "🩳", label: "半袖・薄着", message: "暑くなります。通気性の良い服で、熱中症に注意。", level: "caution" },
    { min: 24, emoji: "👕", label: "半袖", message: "日中は半袖で過ごせます。", level: "good" },
    { min: 20, emoji: "👔", label: "長袖シャツ・薄手の長袖", message: "長袖1枚がちょうど良い気温です。", level: "good" },
    { min: 16, emoji: "🧥", label: "カーディガン・薄手の上着", message: "長袖に、さっと羽織れる物を。", level: "ok" },
    { min: 12, emoji: "🧥", label: "セーター・ジャケット", message: "厚手のトップスか、ジャケットが必要です。", level: "ok" },
    { min: 7, emoji: "🧥", label: "コート", message: "コートを着て出かけましょう。", level: "caution" },
    { min: -100, emoji: "🧣", label: "厚手のコート・マフラー・手袋", message: "しっかり防寒を。", level: "bad" },
  ];
  const c = levels.find((l) => high >= l.min)!;

  const notes: string[] = [];
  if (high - low >= 10) notes.push(`寒暖差が大きい（${Math.round(low)}〜${Math.round(high)}°C）ので、脱ぎ着しやすい服を。`);
  if (wind >= 8) notes.push("風が強く、体感温度は低めです。");

  return { emoji: c.emoji, title: "服装", label: c.label, level: c.level,
    message: [c.message, ...notes].join(" ") };
}

export function dailyAdvice(day: DailyForecast): Advice[] {
  return [laundryAdvice(day), umbrellaAdvice(day), clothingAdvice(day)];
}

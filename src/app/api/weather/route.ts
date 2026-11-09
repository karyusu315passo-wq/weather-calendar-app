import type { NextRequest } from "next/server";
import { buildWeatherResponse, type OwmCurrent, type OwmForecast } from "@/lib/weather";

const BASE = "https://api.openweathermap.org/data/2.5";

/**
 * GET /api/weather?city=Tokyo
 * GET /api/weather?lat=35.68&lon=139.76
 *
 * API キーはサーバー側（環境変数）でのみ扱い、ブラウザには一切渡さない。
 */
export async function GET(request: NextRequest) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "サーバーに OPENWEATHER_API_KEY が設定されていません（.env.local / Vercel の環境変数を確認してください）" },
      { status: 500 },
    );
  }

  const sp = request.nextUrl.searchParams;
  const city = sp.get("city")?.trim();
  const lat = sp.get("lat");
  const lon = sp.get("lon");

  const params = new URLSearchParams({ appid: apiKey, units: "metric", lang: "ja" });
  if (lat && lon && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lon))) {
    params.set("lat", lat);
    params.set("lon", lon);
  } else if (city) {
    params.set("q", city);
  } else {
    return Response.json({ error: "city または lat/lon を指定してください" }, { status: 400 });
  }

  try {
    // 現在の天気と 5日間(3時間ごと)予報を並列で取得。10分キャッシュして API 呼び出し回数を節約
    const [curRes, fcRes] = await Promise.all([
      fetch(`${BASE}/weather?${params}`, { next: { revalidate: 600 } }),
      fetch(`${BASE}/forecast?${params}`, { next: { revalidate: 600 } }),
    ]);

    if (!curRes.ok || !fcRes.ok) {
      const status = !curRes.ok ? curRes.status : fcRes.status;
      const message =
        status === 404
          ? "都市が見つかりませんでした。英語表記（例: Tokyo, Osaka）でも試してください"
          : status === 401
            ? "API キーが無効です（発行直後は有効化まで最大 2 時間ほどかかることがあります）"
            : `天気データの取得に失敗しました (${status})`;
      return Response.json({ error: message }, { status });
    }

    const [current, forecast] = (await Promise.all([curRes.json(), fcRes.json()])) as [OwmCurrent, OwmForecast];
    return Response.json(buildWeatherResponse(current, forecast));
  } catch {
    return Response.json({ error: "天気サービスに接続できませんでした" }, { status: 502 });
  }
}

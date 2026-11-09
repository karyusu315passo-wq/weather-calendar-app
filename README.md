# 🌤️ お天気カレンダー

OpenWeatherMap API と連携した天気予報 Web アプリです（Next.js App Router + Tailwind CSS）。

## 機能

- 都市名検索 / 📍 現在地（Geolocation API）で天気を取得
- 気温（現在・最高・最低・体感）、天気、湿度、降水確率、風速を表示
- カレンダーで日付を選ぶと、その日の予報と 3 時間ごとの予報に切り替え（無料 API の範囲：今日から約 5 日間）
- 最後に検索した都市を記憶

## 仕組み

```
ブラウザ ──> /api/weather (Next.js Route Handler) ──> OpenWeatherMap API
                    ↑ API キーはここ（サーバー側）でのみ使用
```

API キーは環境変数 `OPENWEATHER_API_KEY` で管理し、コードには直書きしていません。
ブラウザからは自前の `/api/weather` だけを呼ぶため、キーがクライアントに露出しません。

使用 API（無料枠）:
- Current Weather `GET /data/2.5/weather`
- 5 day / 3 hour Forecast `GET /data/2.5/forecast`（降水確率 `pop` を含む）

## ローカルでの起動

```bash
npm install
cp .env.example .env.local   # OPENWEATHER_API_KEY に自分のキーを設定
npm run dev
```

http://localhost:3000 を開きます。

## デプロイ（Vercel）

1. GitHub のリポジトリを Vercel に Import
2. Project Settings → Environment Variables に `OPENWEATHER_API_KEY` を追加
3. Deploy

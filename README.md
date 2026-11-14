# 🌤️ お天気カレンダー

OpenWeatherMap API と連携した天気予報 Web アプリです（Next.js App Router + Tailwind CSS）。

## 機能

- 都市名検索 / 📍 現在地（Geolocation API）で天気を取得
- 気温（現在・最高・最低・体感）、天気、湿度、降水確率、風速を表示
- カレンダーで日付を選ぶと、その日の予報と 3 時間ごとの予報に切り替え（無料 API の範囲：今日から約 5 日間）
- 最後に検索した都市を記憶
- 選んだ日の洗濯指数・傘・服装のアドバイスを表示（下記「発展機能」）

## 発展機能（アイディア3つ）

### 1. 👕 洗濯指数
- 誰の：毎朝洗濯物を外に干すか迷う人
- どんな課題を：天気予報を見ても「今日は乾くのか」がすぐに判断できない
- どう解決するか：日中の気温・湿度・風速・降水確率から 0〜100 の指数を出し、「よく乾く／部屋干しがおすすめ」とひと言で示す

### 2. ☂️ 傘アドバイス
- 誰の：通勤・通学で出かける人
- どんな課題を：降水確率の数字だけでは、傘を持つべきか、何時ごろ降るのかがわからない
- どう解決するか：3時間ごとの予報から「必要／折りたたみがあると安心／不要」を判定し、雨が降りそうな時間帯も表示する

### 3. 🧥 服装アドバイス
- 誰の：朝、何を着ていくか迷う人
- どんな課題を：最高・最低気温の数字から、ちょうどいい服装を考えるのが手間
- どう解決するか：日中の最高気温に合わせて服装を提案し、寒暖差が大きい日や風が強い日には注意も添える

実装：判定ロジックは `src/lib/advice.ts`、表示は `src/components/AdviceCards.tsx`。

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

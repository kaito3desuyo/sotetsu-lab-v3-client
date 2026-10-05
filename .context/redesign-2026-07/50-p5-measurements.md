# P5 実測記録 — trip-blocks ペイロード / Lighthouse(モバイル)

作成: 2026-07-13（T5.1）
関連: `30-architecture.md` §6（モノレポルート `/home/seapolis/Projects/sotetsu-lab-v3/.context/redesign-2026-07/` 配下。本リポジトリ内には存在しないため参照のみ・コピーはしない）、`35-architecture-new-pages.md` §1.2 / §6（D-7: 既存バルク流用で確定・実装最初期にペイロード実測のみ行う旨）

## 1. trip-blocks ペイロード実測

- 対象 URL: `http://localhost:4200/train-diagram`（N1 ダイヤグラムページ。同ページが `TripBlockQuery#findManyByCalendarId` 経由で上下 2 本の `/v3/trip-blocks` をバルク取得する）
- 有効 calendarId: `de94e6b3-6d6c-445e-9c35-c8f39bacf3fb`（Playwright でアプリを実際に開き、発火した実リクエストから採取）
- 計測方法: playwright-cli で認証済みセッションのままアプリを開き、`requests` / `request <id>` コマンドでブラウザが実際に受信したレスポンスの `content-length` ヘッダ（転送バイト数）と DevTools 計測の `duration`（ms）をそのまま記録。捏造・推測値なし。
- 計測日時: 2026-07-13T13:35 UTC 付近

| リクエスト | ステータス | 転送バイト数（content-length） | 取得時間 |
|---|---|---|---|
| `GET /v3/trip-blocks?calendarId=de94e6b3-...&tripDirection=0` | 200 | 6,072,037 B | 3,673 ms |
| `GET /v3/trip-blocks?calendarId=de94e6b3-...&tripDirection=1` | 200 | 6,131,763 B | 6,216 ms |
| **上下合計** | — | **12,203,800 B（≈ 11.64 MiB）** | 並列発行（`forkJoin`）のため壁時計時間は概ね `max(3673, 6216) = 6,216 ms`。逐次換算の合計は `9,889 ms` |

- gzip 圧縮後サイズ: **計測不能**。両レスポンスとも応答ヘッダに `content-encoding` が存在せず、無圧縮で配信されている（`content-length` = 圧縮前後同一の生バイト数）。これは D-7/30-architecture §6.2 で言及された「trip-blocks バルクの転送量が実測で問題になった場合、圧縮を発動する」の判断材料になる一次情報である。
- 認証: `AuthInterceptor` が付与する `x-sotetsu-lab-authorization: Bearer <accessToken>` 付きリクエストとして観測（Playwright でアプリの実認証フローをそのまま利用）。

## 2. Lighthouse（モバイル）

- 対象 URL: `http://localhost:4200/`（トップページ = dashboard）
- Chrome: `/usr/bin/google-chrome`（`--headless --no-sandbox`）、lighthouse `12.8.2`（`npx lighthouse`、レジストリから都度取得）
- 計測日時: 2026-07-13T13:44 UTC 付近（`fetchTime` = `2026-07-13T13:44:50.264Z`）

### 実行したコマンド（最終・成功）

```
npx lighthouse http://localhost:4200/ \
  --form-factor=mobile \
  --screenEmulation.mobile \
  --preset=perf \
  --chrome-flags="--headless --no-sandbox" \
  --output=json \
  --output-path=<tmp>/lighthouse-final.json \
  --max-wait-for-fcp=120000 \
  --max-wait-for-load=150000
```

指示書の元コマンドから **`--max-wait-for-fcp` / `--max-wait-for-load` の延長のみ**を追加している（理由は下記「発生した失敗と原因」参照）。それ以外のオプション（`--form-factor=mobile` `--screenEmulation.mobile` `--preset=perf` `--chrome-flags` `--output`）は指示書のコマンドと同一。

### 結果（`configSettings.formFactor: mobile` / `throttlingMethod: devtools`＝実スロットリング）

| 指標 | 値 |
|---|---|
| Performance スコア | **0.53**（53/100） |
| First Contentful Paint (FCP) | **57.1 s**（57,080 ms） |
| Largest Contentful Paint (LCP) | **57.1 s**（57,080 ms、FCP と同値） |
| Total Blocking Time (TBT) | **150 ms**（148.4 ms） |
| Cumulative Layout Shift (CLS) | **0.041** |
| Speed Index | 57.2 s（参考値） |

再現性確認のため同条件でもう 1 回実行（`lighthouse-perf-mobile-extended.json`、`--form-factor`/`--screenEmulation.mobile` 明示なしの同等コマンド）でも Performance 0.52・FCP/LCP 57.0 s・TBT 172 ms・CLS 0.041 と近似した値が得られ、単発の異常値ではないことを確認した。

### 発生した失敗と原因（DoD 記載義務）

1. **指示書どおりのコマンド（タイムアウト延長なし）は `NO_FCP` で失敗した**。実出力抜粋:

```
Runtime error encountered: The page did not paint any content. Please ensure you keep the browser window in the foreground during the load and try again. (NO_FCP)
```

   原因調査の結果、`--preset=perf` は `throttlingMethod` を `simulate`（トレース収集後にシミュレーションで速度を算出）ではなく `devtools`（実際に 1.6 Mbps / RTT 150ms でネットワークを実スロットルする）に切り替えることが判明した（`configSettings.throttlingMethod: "devtools"` を実際の出力 JSON で確認）。この実スロットリング下では、既定の `maxWaitForFcp=30000ms` 以内にアプリが最初の描画に到達できず、タイムアウトしていた。これは計測ツールの不具合ではなく、**実モバイル回線相当の速度でこのアプリの初回描画が 30 秒を超える**という実測結果そのものである。
2. 上記の原因を踏まえ `--max-wait-for-fcp=120000 --max-wait-for-load=150000` を追加して再実行し、成功した（上記「結果」表）。
3. 成功した実行でも、非致命的な `PROTOCOL_TIMEOUT`（`Method: Network.getResponseBody`、対象は "Enable text compression" 診断監査 = weight 0 の補助チェック）が `runtimeError` として記録されている。これは巨大な無圧縮 `trip-blocks` レスポンスボディを CDP 経由で再取得する処理がタイムアウトしたものと考えられ、Performance カテゴリスコア・Core Web Vitals（FCP/LCP/TBT/CLS）の算出自体には影響していない（`categories.performance.score` は正常に算出済み）。

## 3. まとめ（D-7 判断材料）

- trip-blocks バルクは上下合計 **約 11.64 MiB・無圧縮**、取得に数秒（並列で最大 6.2 秒）を要する。gzip 圧縮を有効化すれば JSON の性質上、大幅な削減が期待できる（本タスクでは実測のみ・圧縮の実装判断は対象外）。
- モバイル実スロットリング下の Lighthouse 実測は Performance 0.53・FCP/LCP 57.1 s と、体感上も明確に遅い部類。ただし対象は dashboard（トップページ）であり、trip-blocks を直接フェッチする `/train-diagram` の実測ではない点に留意（DoD の指示 URL が `http://localhost:4200/` のため、本ページを対象とした）。

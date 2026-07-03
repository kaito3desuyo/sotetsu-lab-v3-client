# 相鉄ラボ v3 改修 実装計画（進捗台帳）

作成: 2026-07-03 / オーケストレーション: Opus 4.8（執行管理のみ）
仕様の一次ソース: `.context/redesign-2026-07/`（00/10/15/20/25/30/35/90）。**再調査・再設計・再決定は禁止**。

- 対象リポジトリ: `sotetsu-lab-v3-client`（Angular 20 / Material M2 / Tailwind `tw-`）, `sotetsu-lab-v3-api`（NestJS）
- 作業ブランチ: 各リポジトリ `feature/redesign-2026-07`（master から分岐 + `first commit` 空コミット）。**master 直コミット禁止**
- 進捗マーカー: `[ ]` 未着手 / `[~]` 着手中 / `[x]` 完了（コミット済み）。この計画ファイルが唯一の進捗台帳
- 仕様パスの起点: `.context/redesign-2026-07/`（以後 `10-spec` 等と略記）。モックは `.context/redesign-2026-07/mockups/mockup-NN.jpeg`

## 委譲ルール（全 subagent 共通）
1 タスク = 1 subagent（Sonnet, medium）= 1 コミット。使い捨て・コンテキスト非継承。
指示はポインタ渡し（「◯◯.md の §X を Read してから着手」）。報告は「変更ファイル一覧 + テスト結果 + 逸脱事項」10 行以内。

## 絶対の制約（毎回 subagent に含める定型）
- **情報削減禁止**（既存の列・行・リンク・ボタン・記号・色分けを 1 つも落とさない。初期折りたたみは可、削除は不可）
- `initialDataResolver` のフェッチ順序変更禁止 / auth・infrastructure 凍結 / SSR 削除禁止 / v2 API 触らない
- 種別色は `tripClass.tripClassColor`、群色は `operation-number-color.pipe` 規則、`formationNumber` は無加工（×N を付けない）
- グローバルストア新設禁止（elf の plain const store + infrastructure 層キャッシュ。30 §1 / 35 §1.2）
- **CSS は Tailwind（`tw-` prefix ユーティリティ）を優先**。生の CSS/scss は Angular Material の見た目上書き等で不可避な最小限のみ（2026-07-03 ユーザー追加指示）
- 参照実装は `pages/operation/operation-real-time/`（単一コンポーネント + const ストア + コンポーネント内フェッチ + loadingQueue）
- **client の `CLAUDE.md`「標準ページ構成パターン」に厳密に従う**（P3/P4）: `stores/*.store.ts` は `createStore` の const object（`createElfStore`/`states/` は使わない）/ `-c`・`-p` 分割禁止 / 既存 dashboard・timetable-*・operation-table の**旧構成を参考にしない** / OnPush + standalone + `inject()`+`#` / Resolver は「グローバル初期化待ち + title」のみ / 順次フェッチは `async/await + lastValueFrom`
- コミット: Conventional Commits + 絵文字テキスト形式（例 `feat: :sparkles: ...`）。作業ブランチのみ

## 検証ゲート（各ページ移行/新規ページ完了時に必須）
- `npm test` / lint / 型が通る
- Playwright MCP で `http://localhost:4200` の該当ページをモバイル幅 390px で開き、フルページスクショ → 対応モックと目視比較（情報要素の欠落 = 差し戻し）
- 10/15 の「維持される」系リグレッション項目を確認

---

## P0 止血（client / 想定 1 コミット）

- [x] **T0.1 C1 即効修正 3 点** — コミット `eb2754e`。jest 84 suites green / tsc・lint は変更前と完全一致（既存無関係エラーのみ）。**Playwright 実遷移確認は T3.1 に統合**（dev server 起動をまとめるため）
  - 対象: `app.component.ts`（NavigationError 購読追加 → LoadingService.close + トースト）/ `timetable-station.service.ts`（fetchTripBlocks の undefined filter、0 件時 API 不発）/ `timetable-station.component.ts`（router.navigate の Promise 処理）
  - 参照: `10-spec` C1 / `30` §7
  - DoD: 10-spec C1 受け入れ条件 4 項目。`GET /v3/trip-blocks/undefined` が発行されない
  - 検証: `npm test`・lint・型 / Playwright で trip_block 未割当駅→別駅遷移が正常

---

## P1 共通基盤（client / 想定 6〜8 コミット・純関数は全てユニットテスト必須） ✅完了

> **P1 検証ゲート通過（2026-07-04 実測）**: jest 全体 master baseline=`Test Suites: 37 failed/64 passed, Tests: 84 passed` → P1後=`37 failed/73 passed, Tests: 182 passed`。**failed suite 数は 37 で不変＝回帰ゼロ**、新規 9 spec(98 tests)全 pass。既存 37 suite は型エラー(dayjs plugin 型 / jest-dom matcher 型等)で master 時点から実行不能＝プロジェクト既存の技術的負債（redesign スコープ外。**P5 でユーザーに報告する**）。P1 は純関数/部品で UI 無しのため Playwright ゲートは対象外。

- [ ] **T1.1 railway-day.ts 新設**
  - 対象: `src/app/core/utils/railway-day.ts`（新設）+ spec
  - 参照: `35` §1.1（getRailwayDate / toAbsoluteTime / toDisplayTime）
  - DoD: 3 関数実装、境界値（4 時境界・24 時超え days オフセット）テスト green。**既存 10 箇所の置換はしない**
  - 検証: `npm test`

- [x] **T1.2 絞り込みチップ共通部品** — filter-chips 部品（b3f4e6f）+ Tailwind化（12c8b8a）+ spec修復（3c14f20, jest 8/8 **実測確認**。新設時の「green」は虚偽で TS2339 suite落ちだった）
  - 対象: `src/app/shared/` に chip-filter 部品（`mat-chip-listbox`、multiple/single 両対応）
  - 参照: `20` §4 / §6 / R-4（単一選択は ● 先頭マーカー）
  - DoD: multiple（会社/群/路線）と single（N1/N2 路線）を props で切替、選択値 output、localStorage 永続は利用側で注入可能
  - 検証: `npm test`・lint・型

- [x] **T1.3 運番タグ部品（群色）** — operation-number-tag（3ea42e4, jest 8/8報告・フェーズ末総検証予定）
  - 対象: `src/app/shared/` に運用番号タグ部品（既存 `operation-number-color.pipe` 流用）
  - 参照: `20` §1（群色規則）/ 90（丸型固定不要・群色維持）
  - DoD: 運用番号 → 群色 12% 透過背景、行路図リンク slot、100=灰。角型可
  - 検証: `npm test`・lint・型

- [x] **T1.4 空状態部品** — empty-state（4bb6ff5, jest 7/7報告）。message単一入力（2段が要るなら title/subtitle を後で追加）
  - 対象: `src/app/shared/` に空状態ブロック（アイコン + 説明 + 次アクションボタン）
  - 参照: `20` §4 / モック 07 / R-7（必ず次アクションを示す）
  - DoD: message/action を props 化、モック 07 と一致
  - 検証: `npm test`・lint・型 / Playwright でモック 07 比較

- [x] **T1.5 visibleStations + 罫線 util** — core/utils に visible-stations/border-after-station（f14c699, jest 33/33報告）。現行一致は合成fixture、実データ最終確認はT3.5
  - 対象: `src/app/shared/` に `visibleStations(allStations, selectedRouteIds)` / `borderAfterStation(visibleStations)`（純関数）+ spec
  - 参照: `30` §4 / `10-spec` B6（`get-border-setting.util.ts` を置換対象として調査）
  - DoD: 全路線時に現行罫線位置と一致、境界検出はデータ駆動、テスト green
  - 検証: `npm test`

- [x] **T1.6 trip-block infrastructure キャッシュ** — query/service に worldVersion付shareReplay + findManyByCalendarId(forkJoin上下) + invalidateAll（8b109ac, jest 6/6報告）
  - 対象: `libs/trip-block` の service/repository（calendarId+tripDirection キーの shareReplay メモリキャッシュ、world バージョンキー付き）
  - 参照: `35` §1.2 / §0（`GET /v3/trip-blocks?calendarId=&tripDirection=` 上下 2 並列）
  - DoD: N1/N2/N3 が同メソッドでキャッシュ共有、ページ間遷移で再取得なし。**グローバルストア新設しない**
  - 検証: `npm test`・型

- [x] **T1.7 diagram-scale + 駅軸** — shared/diagram-scale.ts に timeToX/stationToY/buildStationAxis（24fb029, jest 8/8報告）
  - 対象: `src/app/shared/diagram-scale.ts`（timeToX / stationToY）+ `buildStationAxis(routeId)` + spec
  - 参照: `35` §1.3 / §2（基準所要時間比 = D-8）
  - DoD: 時刻→x・駅→y 変換、駅間隔は代表各停 times から導出（導出不能は等間隔フォールバック）、テスト green
  - 検証: `npm test`

- [x] **T1.8 train-position.util.ts** — shared/train-position.util.ts（c60dad5, jest 11/11報告）。逸脱: 未出発判定を着時刻優先に変更（路線境界駅の誤判定回避）→ N2実装T4.2で実データ確認
  - 対象: `src/app/shared/train-position.util.ts`（`estimatePositions(tripBlocks, stationAxis, at)` 純関数）+ spec
  - 参照: `35` §3 / §6 / `15-spec` N2 受け入れ条件（境界値）
  - DoD: stopped/between/未出発/到着済 の判定、線形補間、境界値（発着ちょうど・0 秒停車・24 時超え・4 時境界）テスト green
  - 検証: `npm test`

---

## P2 API（api / 想定 3 コミット・client と独立に完結） ✅完了（コード面）

> **P2 検証ゲート通過（2026-07-04 実測）**: api feature jest=`Test Suites: 1 failed/15 passed, Tests: 3 failed/83 passed`。failed は既存 `operation-sighting.query.spec.ts`（createQueryBuilder モック欠如、master 由来・3 subagent が stash 確認済み）のみ。P2 新規（operation-group / calendar_dates / seed）は全 pass＝**回帰ゼロ**。
> **⚠ P2 の実DB残タスク（sandbox で実行不可・デプロイ/ユーザー環境で要確認）**: ①マイグレーション `calendar_dates` の実DB適用 ②`npm run seed:calendar-dates:holidays -- --dry-run`→本実行 ③実CSV `db/seeds/data/syukujitsu.csv`（内閣府 Shift_JIS）配置 ④実DBでシード結果確認後に `specialCalendarDays`/`isSpecialCalendarAvailable` を v3 経路から撤去（D-13）。

- [x] **T2.1 /v3/operations/groups** — operation-number-circulation 共通モジュール化 + GET /groups（e406c64, jest 31/31）。calendarId不要=静的Map。既存3 failedは無関係（stash確認済）
  - 対象: `src/libs/operation/` 配下に controller/service/dto（`operationNumberCirculateMap`〔`operation-sighting.v3.circulation.ts`〕を共通モジュール化）
  - 参照: `30` §2.2（D-2）
  - DoD: `GET /v3/operations/groups` が `[{groupName, operationNumbers[]}]` を返す。DB 変更なし、単一情報源化
  - 検証: `npm test`（api）/ 型 / エンドポイント手動 curl

- [x] **T2.2 calendar_dates 一式** — 移行+libs/calendar CRUD+findOneBySpecificDate改修（e1ef52e, jest 18/18）。判定=(曜日 AND NOT type2) OR type1。specialCalendarDays維持(T2.3後に撤去)。⚠**マイグレーションは実DB未接続で目視のみ→実DB適用はデプロイ時に要確認**
  - 対象: `db/migrations/<unix ms>-CreateCalendarDates.ts` + `src/libs/calendar/` に model/dto/query/service/controller / `CalendarQuery.findOneBySpecificDate` 改修
  - 参照: `35` §8（DB スキーマ・API・判定改修）/ `15-spec` N4
  - DoD: CRUD（GET 絞り込み/POST/DELETE）、UNIQUE(calendar_id,date)、判定=「(曜日 AND NOT EXISTS type2) OR EXISTS type1」。**v2 は触らない**
  - 検証: `npm test`（api）/ マイグレーション up/down / 受け入れ条件（N4）

- [x] **T2.3 祝日シードコマンド + CSV** — seed-holidays/special + 純関数パーサ(Shift_JIS は Node標準 TextDecoder)（86f9bdc, jest 16/16）。⚠実CSV未配置・実DB seed未実行(sandbox遮断)
  - 対象: `db/seeds/seed-calendar-dates-holidays.ts` + `db/seeds/seed-calendar-dates-special.ts` + `db/seeds/data/syukujitsu.csv`（内閣府 Shift_JIS）+ package.json script
  - 参照: `35` §8 祝日シード節 / D-13 / D-15
  - DoD: sunday=true に type1 / 平日系に type2 を upsert（ON CONFLICT DO NOTHING）、`--from/--to`・`--dry-run`、specialCalendarDays 移行、冪等
  - 検証: `npm run seed:calendar-dates:holidays -- --dry-run` / 再実行安全性

---

## P3 ページ移行（client / 想定 8 コミット・各ページ = B 仕様 + 20 §5.x + モック NN。受け入れ条件をそのまま DoD に）

各タスク共通: Resolver 廃止（title + グローバル初期化待ちのみ）+ 単一コンポーネント化 + loadingQueue + 旧 -c/-p・states/*.state.ts 撤去（30 §1）。検証ゲート必須。

- [ ] **T3.1 駅別時刻表**（B1 上下切替 / B7 過去編成非表示 / C1 恒久）
  - 対象: `pages/timetable/timetable-station/` 一式
  - 参照: `10-spec` B1/B7/C1 / `20` §5.1 / `30` §5・§7 / モック 01
  - DoD: B1・B7・C1 の全受け入れ条件（既存セル 7 要素維持・空状態・過去ダイヤ編成列非描画）
  - 検証: 検証ゲート（モック 01 比較）

- [ ] **T3.2 リアルタイム運用情報**（B2 会社 / B3 群 チップ）
  - 対象: `pages/operation/operation-real-time/`（既に目標形。B2/B3 追加）
  - 参照: `10-spec` B2/B3 / `20` §5.2 / `30` §3 / モック 02
  - DoD: 会社・群チップ（AND/OR）、localStorage 永続、2 テーブル維持（モバイルはタブ）、休車 100 の扱い、鮮度表現、形式・所属付記
  - 検証: 検証ゲート（モック 02 比較）

- [ ] **T3.3 運用表**（B4 縦カード刷新 + 群チップ）
  - 対象: `pages/operation/operation-table/` 一式
  - 参照: `10-spec` B4 / `20` §5.3 / モック 03
  - DoD: 縦タイムラインカード（情報要素・記号・リンク維持、Material 流再設計可）、群チップ絞り込み、リアルタイムと永続キー独立
  - 検証: 検証ゲート（モック 03 比較）

- [ ] **T3.4 運用行路図**（B5 路線チップ + visibleStations）
  - 対象: `pages/operation/operation-route-diagram/` 一式（SVG データ層のみ移行）
  - 参照: `10-spec` B5 / `20` §5.4 / `30` §4 / モック 04
  - DoD: 路線チップ（経由路線のみ既定 ON=D-4、非経由 disabled）、隠し駅飛ばし再接続、**縦罫線維持**、PNG 出力が絞り込み反映
  - 検証: 検証ゲート（モック 04 比較）

- [ ] **T3.5 全線時刻表**（B6 罫線データ駆動 + 路線チップ）
  - 対象: `pages/timetable/timetable-all-line/` 一式（巨大 util 分割含む）
  - 参照: `10-spec` B6 / `20` §5.5 / `30` §4 / モック 05
  - DoD: 路線チップ、罫線データ駆動（`get-border-setting.util.ts` 参照残存ゼロ）、着発 2 段 rowspan・記号・ページネーション・操作 4 行維持
  - 検証: 検証ゲート（モック 05 比較）

- [ ] **T3.6 過去の運用情報**（B9 刷新 + 会社チップ）
  - 対象: `pages/operation/operation-past-time/` 一式（-c/-p 残骸削除）
  - 参照: `10-spec` B9 / `20` §5.12 / モック 13
  - DoD: 検索(URL 互換)・マトリクス(sticky・複数目撃・赤枠)・無効化/復元メニュー(権限制御・モバイル長押し)・会社チップ・下部カード維持
  - 検証: 検証ゲート（モック 13 比較）

- [ ] **T3.7 列車情報入力統合**（B8 add/copy/update 統合）
  - 対象: `pages/timetable/timetable-add|copy|update/` → 単一コンポーネント + モード統合
  - 参照: `10-spec` B8 / `20` §5.6 / `30` §1 / モック 06
  - DoD: 路線チップ絞り込み・trip-block 単位コピー(一括オフセット)・モバイル 1 列車 1 画面・モード別保存 API・elf persist-state 下書き復元
  - 検証: 検証ゲート（モック 06 比較）

- [ ] **T3.8 ダッシュボード**（N3）
  - 対象: `pages/dashboard/` を単一コンポーネントで作り直し
  - 参照: `15-spec` N3 / `20` §5.10 / `35` §7 / モック 11
  - DoD: 今日の状況カード(ダイヤ名・時計・計画走行本数=estimatePositions・目撃投稿数)・クイックタイル 4(指定順)・最新目撃 3・既存 6 カード折りたたみ全維持(指定順)・広告枠
  - 検証: 検証ゲート（モック 11 比較）

---

## P4 新ページ（client / 想定 2〜3 コミット・P1 部品前提）

- [ ] **T4.1 N1 ダイヤグラム**
  - 対象: `pages/timetable/timetable-diagram/`（新設・単一コンポーネント）
  - 参照: `15-spec` N1 / `20` §5.7 / `35` §2 / モック 08
  - DoD: N1 全受け入れ条件（種別色斜線・待避水平線・タップ強調+情報パネル・路線跨ぎ端点ラベル・現在時刻カーソル=今日のみ・トップレベルナビ）
  - 検証: 検証ゲート（モック 08 比較）

- [ ] **T4.2 N2 列車位置情報**
  - 対象: `pages/train-location/`（新設・単一コンポーネント）
  - 参照: `15-spec` N2 / `20` §5.8 / `35` §3 / モック 09
  - DoD: N2 全受け入れ条件（境界値位置・停車中表示・複数停車集約バッジ・上り左/下り右・10 秒追従・時刻指定・免責常設・深夜帯・トップレベルナビ）
  - 検証: 検証ゲート（モック 09 比較）

---

## P5 仕上げ（想定 1〜2 コミット）

- [ ] **T5.1 ペイロード実測 + Lighthouse**
  - 対象: `.context/` に計測結果を記録
  - 参照: `30` §6.3 / `35` §6（D-7 判断材料）
  - DoD: trip-blocks 上下合計サイズ・取得時間、改善前後 Lighthouse(モバイル)を記録
  - 検証: 記録ファイル存在 + 数値記載

- [ ] **T5.2 品質フロア一括（R-5〜R-8）**
  - 対象: 全ページ横断（トークン適用確認）
  - 参照: `25` R-5/R-6/R-7/R-8
  - DoD: オレンジ地文字 15px+bold 限定 / 動き 4 種限定 + reduced-motion / 文言短縮 / focus-visible・tabular-nums・44px タップ
  - 検証: `npm test`・lint / Playwright で focus-visible・reduced-motion 目視

---

## 想定コミット数
P0=1 / P1=6〜8 / P2=3 / P3=8 / P4=2〜3 / P5=1〜2（合計 21〜25）

## コミット署名（運用メモ）
- サンドボックス下で GPG 署名の pinentry が非対話ブロックするため、全コミットは `git -c commit.gpgsign=false commit` で**署名なし**で積む（ローカル config は書き換えない）
- **作業完了後**（P5 or finishing 時）にユーザー承認の下、全コミットを同内容で署名ありにやり直す（ユーザー指示 2026-07-03）

## 溜まった新規判断（ユーザーへまとめて質問する用・現時点なし）
- **[P2 発] 内閣府祝日 CSV の調達方法**: sandbox が内閣府サイトへ接続不可のため `db/seeds/data/syukujitsu.csv` を私（Opus）が取得できない。ユーザーに `! curl` で取得してもらうか、私が dangerouslyDisableSandbox で1回だけ取得するか要確認（シードのロジック・パーサはフィクスチャでテスト済み、残るは実CSV配置のみ）。
- **[P2 発] 実DB検証**: マイグレーション適用・シード実行・specialCalendarDays 撤去は実DB環境が必要。デプロイ時にユーザー環境で実施する段取りを後で確認。

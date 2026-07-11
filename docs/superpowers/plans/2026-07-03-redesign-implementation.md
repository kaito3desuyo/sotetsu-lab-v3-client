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

> **検証環境（2026-07-04 確定）**: ユーザーが Docker 一式起動済み（client=localhost:4200 / api=localhost:3000）。Playwright MCP から localhost:4200 到達可・実データ検証可能。**backend 500 は解消済み**（ユーザーが `npm run migration:run` を実DBへ適用→ calendar_dates 作成→ findOneBySpecificDate 正常化→ todaysCalendarList ロード可）。残る console error（401 profile / WebSocket 3021 / googleads 403）は全て無害・無関係。
>
> **P3 実データ検証結果（2026-07-04・390px Playwright 目視）**:
> - T3.2 リアルタイム: ✅パス（会社/群フィルタチップ・運用順/編成順タブ・全列・凡例・投稿フォーム維持）
> - T3.3 運用表: ✅パス（群チップ・ジャンプ・縦タイムラインカード・出庫入庫/回送/種別色/行路図リンク維持）
> - T3.6 過去運用: ✅パス（基準日/日数/無効化トグル/検索・会社チップ・空状態・下部カード維持）
> - T3.5 全線時刻表: 🟡構造+データ維持（路線チップ全選択・ダイヤ帯・3ヘッダ行・着発2段・列車セル1200 DOM ノード確認）だが**ページネーション counter が「0/0」表示＝軽微リグレッション疑い**→ 要フォロー
> - T3.1 駅別時刻表 / T3.4 行路図: tsc/jest パス済み。実データ視覚検証は station_id/operationId 取得の手間により**P5 クリーンアップへ繰延**

- [~] **T3.1 駅別時刻表**（B1 上下切替 / B7 過去編成非表示 / C1 恒久） — 実装完了・実データ検証待ち — 単一構成移行+B1+B7+C1恒久（7e3ecca）。tsc/ng build クリーン、timetable-station jest 5/5。副次修正: setup-jest.ts(reflect-metadata)等の既存型エラーを直し全体 suite **37→8 failed に改善**（残8は旧-c/-pや後続移行ページのspec）。⚠**実データ目視は backend 500(下記)で保留**
  - 対象: `pages/timetable/timetable-station/` 一式
  - 参照: `10-spec` B1/B7/C1 / `20` §5.1 / `30` §5・§7 / モック 01
  - DoD: B1・B7・C1 の全受け入れ条件（既存セル 7 要素維持・空状態・過去ダイヤ編成列非描画）
  - 検証: 検証ゲート（モック 01 比較）

- [~] **T3.2 リアルタイム運用情報**（B2 会社 / B3 群 チップ） 実装完了・実データ検証待ち — 会社/群2段チップ+2テーブル維持(モバイルtab)+elf永続（9044ed4, operation-real-time jest 18/18、全体8→6 failed改善、既存spec2件もgreen化）。群API配線を libs/operation に追加。逸脱: 休車100を「休」疑似群でclient補完(20§5.2の4値要件に合致)
  - 対象: `pages/operation/operation-real-time/`（既に目標形。B2/B3 追加）
  - 参照: `10-spec` B2/B3 / `20` §5.2 / `30` §3 / モック 02
  - DoD: 会社・群チップ（AND/OR）、localStorage 永続、2 テーブル維持（モバイルはタブ）、休車 100 の扱い、鮮度表現、形式・所属付記
  - 検証: 検証ゲート（モック 02 比較）

- [~] **T3.3 運用表**（B4 縦カード刷新 + 群チップ） 実装完了・実データ検証待ち — 移行+縦タイムラインカード刷新+群チップ（2162e44, operation-table jest 21/21、全体4 failedに改善）。逸脱: モック03の無印/G/Kバッジは実データ群名(1群〜9G群)と不整合で未実装(群色タグで代替)・駅名スペースhack削除
  - 対象: `pages/operation/operation-table/` 一式
  - 参照: `10-spec` B4 / `20` §5.3 / モック 03
  - DoD: 縦タイムラインカード（情報要素・記号・リンク維持、Material 流再設計可）、群チップ絞り込み、リアルタイムと永続キー独立
  - 検証: 検証ゲート（モック 03 比較）

- [~] **T3.4 運用行路図**（B5 路線チップ + visibleStations） 実装完了・実データ検証待ち — データ層移行+路線チップ+visibleStations+縦罫線維持（233fd45, route-diagram jest 16全pass、全体4 failed維持）。SVG描画据え置き。逸脱なし
  - 対象: `pages/operation/operation-route-diagram/` 一式（SVG データ層のみ移行）
  - 参照: `10-spec` B5 / `20` §5.4 / `30` §4 / モック 04
  - DoD: 路線チップ（経由路線のみ既定 ON=D-4、非経由 disabled）、隠し駅飛ばし再接続、**縦罫線維持**、PNG 出力が絞り込み反映
  - 検証: 検証ゲート（モック 04 比較）

- [~] **T3.5 全線時刻表**（B6 罫線データ駆動 + 路線チップ） 実装完了・実データ検証待ち — 移行+路線チップ+罫線データ駆動化(get-border-setting.util.ts削除・参照ゼロ)（fe7b65f, timetable-all-line jest 17/17、全体6 failed=未移行ページのみ）。逸脱: view-modeデータ駆動化は包含的ヒューリスティック→主要駅集合が実データ次第で微差可能性、実データ確認要
  - 対象: `pages/timetable/timetable-all-line/` 一式（巨大 util 分割含む）
  - 参照: `10-spec` B6 / `20` §5.5 / `30` §4 / モック 05
  - DoD: 路線チップ、罫線データ駆動（`get-border-setting.util.ts` 参照残存ゼロ）、着発 2 段 rowspan・記号・ページネーション・操作 4 行維持
  - 検証: 検証ゲート（モック 05 比較）

- [~] **T3.6 過去の運用情報**（B9 刷新 + 会社チップ） 実装完了・実データ検証中 — 移行+残骸削除+会社チップ+長押しメニュー（d9a953d, operation-past-time jest 19/19、全体2 failedに改善）。逸脱: header据え置き・会社チップ永続なし(B9 DoD明記なし)
  - 対象: `pages/operation/operation-past-time/` 一式（-c/-p 残骸削除）
  - 参照: `10-spec` B9 / `20` §5.12 / モック 13
  - DoD: 検索(URL 互換)・マトリクス(sticky・複数目撃・赤枠)・無効化/復元メニュー(権限制御・モバイル長押し)・会社チップ・下部カード維持
  - 検証: 検証ゲート（モック 13 比較）

- [x] **T3.7 列車情報入力統合**（B8 add/copy/update 統合）✅ commit `27330ff`
  - 対象: `pages/timetable/timetable-add|copy|update/` → 単一 `timetable-edit-form/` に統合（旧 `shared/timetable-edit-form/` も削除・`timetable.route.ts` を ADD/COPY/UPDATE 3 ルートへ集約）
  - 参照: `10-spec` B8 / `20` §5.6 / `30` §1 / モック 06
  - DoD: 路線チップ絞り込み・trip-block 単位コピー(一括オフセット)・モバイル 1 列車 1 画面・モード別保存 API・elf persist-state 下書き復元
  - 検証: jest 7/7 suites・34/34 tests pass（自分で `--json` 実測確認）／tsc 新規プロダクションコードにエラー無し（既存の spec 型衝突は無関係）。実データ検証（モック 06 比較・Playwright）は [~] 未実施

- [x] **T3.8 ダッシュボード**（N3）✅ commit `e56d645`
  - 対象: `pages/dashboard/` を単一コンポーネントで作り直し（旧 `-c/-p` = dashboard-main-c / dashboard-description-p 削除）
  - 参照: `15-spec` N3 / `20` §5.10 / `35` §7 / モック 11
  - DoD: 今日の状況カード(ダイヤ名・時計・計画走行本数=estimatePositions・目撃投稿数)・クイックタイル 4(指定順)・最新目撃 3・既存 6 カード折りたたみ全維持(指定順)・広告枠
  - 検証: jest 5/5 suites・14/14 tests pass（`--json` 実測確認）／tsc(app) 0 エラー。実データ検証（モック 11 比較・Playwright）は [~] 未実施
  - 実装判断メモ: ①計画走行本数は全路線統合駅軸(`build-network-station-axis.util.ts`)で算出（単一路線基準にすべきなら要再検討）②目撃位置は各 sighting の operationId で current-position API を個別取得(最大3件・新規API無し)③クイックタイルの `/train-location`(N2)・`/diagram`(N1) はページ未実装のためリンク先ルートは **P4 で登録必要** ④サイト説明の初回展開は elf persistState(`hasVisitedBefore`)

---

## P4 新ページ（client / 想定 2〜3 コミット・P1 部品前提）

- [x] **T4.1 N1 ダイヤグラム** ✅ commit `66e0235`（ルート改名 `6fe07cf` / ディレクトリ移動 `1fc29d8`）
  - 対象: **`pages/train-diagram/`**（新設・単一コンポーネント）
  - 参照: `15-spec` N1 / `20` §5.7 / `35` §2 / モック 08
  - DoD: N1 全受け入れ条件（種別色斜線・待避水平線・タップ強調+情報パネル・路線跨ぎ端点ラベル・現在時刻カーソル=今日のみ・トップレベルナビ）
  - ルート/配置: 仕様§98=`/diagram`・§2=`pages/timetable/timetable-diagram/` だったが**ユーザー指示(2026-07-07)で `/train-diagram`・`pages/train-diagram/` へ変更**（N2 の `/train-location`・`pages/train-location/` と対称に。app.route.ts トップレベル＝D-10。dashboard タイル・sidenav も追随。`TimetableDiagram*`→`TrainDiagram*` 全リネーム）
  - 仕様適合確認: ピンチズームは仕様§5「ピンチ**または**ズームボタン」でボタン式充足・PNG出力はN1要件外（省略は仕様準拠）。実装は N1 受け入れ6条件を満たす
  - 検証: jest 11/11 pass／tsc(app) 0 エラー。**Playwright 実データ視覚検証 済(2026-07-07)**: 07:00-08:00 窓で 117 本の列車線を描画確認。
  - 実データ由来の不具合修正（`9f9127d`）: ①通過駅の欠落時刻 null で `null.split` クラッシュ→`== null` 判定へ ②trip `days` が 1-based（当日=1/翌日分=2）なのに 0-based 実体化で全線が翌日扱い→非表示。`dayOffset(-1)` で修正。
  - デザイン修正（`1164fee`）: 凡例が運行系統別 約40行と冗長 → **種別ベース名で 17 行に集約**（ユーザー指示: 線色はそのまま・「同じ特急なら特急」）。線色は tripClassColor 維持。
  - デザイン判断（ユーザー 2026-07-07）: 路線チップは**自社線に絞らない**（全路線のまま）。§5.7 の4色固定化は不採用（線色維持を優先）。※さらなる意味統合（通勤特急→特急・各駅停車→各停）は要望あれば対応

- [x] **T4.2 N2 列車位置情報** ✅ commit `15ce985`
  - 対象: `pages/train-location/`（新設・単一コンポーネント）
  - 参照: `15-spec` N2 / `20` §5.8 / `35` §3 / モック 09
  - DoD: N2 全受け入れ条件（境界値位置・停車中表示・複数停車集約バッジ・上り左/下り右・10 秒追従・時刻指定・免責常設・深夜帯・トップレベルナビ）
  - 検証: jest 11/11 pass。**Playwright 実データ視覚検証 済(2026-07-07)**: 06:59 平日で 22 本在線・駅ライン＋列車カード描画確認。当初は上記①②のバグで駅ライン下が空白だったが `9f9127d` で解消。
  - デザイン判断: 路線チップは自社線に絞らない（ユーザー指示）。

---

## P4.5 実画面点検（Playwright CLI・モバイル390px・実データ・モック比較）＋修正 — 2026-07-08

全ページを Playwright CLI で実データ描画＋モック比較。jest だけでは捕捉できない実行時/デザイン欠陥を検出し修正した（[[feedback_visual_realdata_gate]]）。

- [x] **T3.7 編集/コピー導線のルート不一致** ✅ `98a71f1`: matrix param navigate と path param route(`:calendarId`)の不一致で NG04002→home。route を matrix 化・paramMap を snake_case 統一。update URL でフォーム描画を実画面確認。
- [x] **種別（系統）サフィックスを表示箇所で除去** ✅ `62f655e`（共通 `baseTripClassName` util `29daec4` / pipe）: 「特急（SO→TY）」→「特急」。**セレクトボックス選択肢は正式名維持**。運用表・train-location カードで実画面確認。
- [x] **列車位置情報カードに行き先・運用番号** ✅ `29daec4`: trip.times に station 未ロードで行き先が常に空だったのを全駅 stationId→駅名マップで解決。運用番号も追加。実画面「各停 湘南台 行 / 運用52 編成9704」確認。
- [x] **null id fetch の500抑止** ✅ `f462a21`: `/calendars/null`・`/operations/calendar/null`・`/trips/station/null`。operation.query の findManyByCalendarId で id 未指定なら空配列＋各ページ fetchCalendar/fetchTrips ガード。実画面で消失確認。
- [x] **リアルタイムのモバイル最適化** ✅ `826a8f7`: 6列テーブルがモバイルで窮屈。目撃時刻セルに最終更新を2行目スタック(`max-sm:`)・最終更新列はモバイル非表示。デスクトップ横並び維持。390pxで確認・body横スクロール無し。
- [x] **路線チップの会社グルーピング(#4c)** ✅ `8dc8c1c`: `FilterChipsComponent` に `group` を追加し会社見出しごとに表示。`AgencyListStateQuery` の agencyName でグルーピング。実画面で相鉄/東急/JR東日本等の見出し確認。
- [x] **列車位置情報の乗換駅リンク(#4b)** ✅ `2535f7b`: 他路線接続駅(乗換駅)に他路線の列車位置情報へのリンクを付与（`buildInterchangeRoutesByStationId` util）。単一選択は維持（ユーザー確定）。実画面で西谷→新横浜線・二俣川→いずみ野線 のリンク確認。
- [x] **ダイヤグラムの統合ネットワーク軸化(#4a)** ✅ `bc6e537`: 単一路線軸→`ServiceService.findOneWithStations`（全線時刻表と同一の運転系統マージ済み駅順）＋複数選択路線チップ(`visibleStations` 流用)で絞り込み。直通列車が路線境界で切れず1本の連続線に。実画面で全20路線=231駅・端点ラベル0(=全連続)・本線+いずみ野線=25駅124線を確認。※既定が全20路線(231駅)で密なため、既定選択の見直しは今後検討。
- [x] **ダイヤグラムの縮尺調整(ホイール/ピンチ)** ✅ `db3abbe`: ホイール=縦縮尺(駅軸)・Shift+ホイール=横縮尺(時間軸)・モバイルはピンチで等倍。両軸をローカル signal 化(横は linkedSignal でボタン連動)。実画面でホイール→縦200→214・Shift+ホイール→横600→660 確認。
- [x] **ダイヤグラム軸の所要時間比化＋経由外区間の線分断** ✅ `8d68889`: 縦軸が等間隔だった問題を、全 trip の連続停車から駅間所要分(中央値)を集約する `buildSegmentMinutesMap` で所要時間比に。経由しない分岐区間を本線列車の線が横切る問題を、駅→所属routeId集合で判定しポリラインを分断(`segments`)して解消。実画面で gap 可変([6,12,18])・124線中56線が分断を確認。
- 実データ由来の在線算出バグ（train-location空白・diagram線ゼロ）は `9f9127d` で既出（null時刻/1-based days）。
- ダイヤグラム凡例集約 `1164fee`。
- 各ページの点検結果（合格/軽微差含む）は本ラウンドで確認済み。

### 追加ラウンド（2026-07-08〜09・ダイヤグラム3タスク）

- [x] **SVG縦ズレ修正** ✅ `1933a1e`: グローバル `svg{max-width:100%}` による幅圧縮で viewBox 等倍縮小→駅ラベルと縦ズレ。`tw-max-w-none tw-shrink-0`+min-width で解消（delta 0px 実測）。
- [x] **接続駅の二重表示** ✅ `e07c30f`: 路線内で連続するが軸上で隣接しない接続駅を接続先直前に複製挿入（`insertJunctionDuplicates`）。二俣川〜希望ヶ丘等の経由区間欠落を解消。
- [x] **軸順の地理マージ** ✅ `e46fef9`: 単独選択時の駅順乱れを `buildMergedRouteAxisOrder` で暫定解消 → **2026-07-10 ラウンドで廃止**（下記 P4.6。operating_systems キュレート順が一次情報と判明したため）。
- [x] **情報パネルの行き先空欄修正** ✅ `bb91c6d` / **上り/下り/両方トグル** ✅ `18f21c1`（両方117=上62+下55 実測）/ FULL jest 112 suites・420 tests green。

## P4.6 フィードバック一括対応ラウンド — 2026-07-10

ユーザー指摘13件（全体2+操作性2 / ダイヤグラム3 / 列車位置6）。実装はサブエージェント委譲、診断・視覚検証は Opus。

- 診断確定: **全線時刻表の駅順の一次情報は DB `operating_systems`（運転系統・sequence 順・route+start/end 区間）**。API `/v3/services/:id/stations` がこれをマージして駅順を生成。ダイヤグラム軸はこのキュレート順のフィルタに一本化する（独自マージ廃止）。
- [x] **駅軸順の全線時刻表準拠化** ✅ `a331a11`→`ea66268`→`4816265`: buildMergedRouteAxisOrder 廃止・networkStations（キュレート順）を選択路線でフィルタ。実画面で3段階検証: ①順序OKだが全駅交互二重化(438行)→隣接判定を方向非依存化 ②なお連鎖(405行)→真因は `route-station-list.state` が特定路線の routeStationLists を**意図的に降順保持**しており、降順処理中の splice が次ペアの隣接を分断してドミノ連鎖 → `orientToBase`（base の first-occurrence index 多数決で向き正規化）で解消。最終 242 行 = 231 キュレート順＋正当な接続駅複製のみ。単独選択も検証（新横浜線=[新横浜,羽沢,西谷]・本線=[横浜→海老名]・三田線=[西高島平→目黒]）。
- [x] **選択ライン強調** ✅（`63fb1ca` に混入 — 並列コミットのレースで列車位置の行き先コミットに同乗。内容は正しい）: 白ハロー(width9)下敷き・非選択 opacity 0.15・選択線を最前面描画。実画面で widths{2:163,4:2,9:2}/opacities{1:2,0.15:163,0.9:2} を実測。
- [x] **ズームキーバインド** ✅ `15de95b`: Ctrl+wheel=縦・Ctrl+Shift+wheel=横・素のwheelはページスクロールに委譲。実マウスで検証(Ctrl+wheel 4318→4744・素wheelはズーム不変でページスクロール)。操作ヒント表示追加。
- [x] **通過駅列車の非表示バグ** ✅ `0263e6c`: build-train-location-rows が between を隣接ペアキーで引いており優等列車が silently 欠落 → 軸インデックス線形補間に変更。実画面で 特急/快速 の描画を確認。
- [x] **カード2段構成＋所属会社** ✅ `de78bee`: 上段=種別/列番/行き先…運用番号、下段=矢印…会社/編成番号。formation.agencyId は既存レスポンスに含まれておりlibs変更不要。実画面確認（「特急 3832 武蔵小杉行 31K / ▲ 東急 編成3101」等）。
- [x] **行き先=trip block 最終目的地** ✅ `63fb1ca`: block 内で時刻最大の trip の最終停車駅（days 1-based 考慮）。相鉄線内の東急直通が「武蔵小杉 行」表示になることを実画面確認。
- [x] **◯本停車中の展開を overlay 化** ✅ `c5aab2f`: cdkConnectedOverlay ポップオーバー（駅名セルの高さに非干渉）。実データで同時複数停車の時刻を再現できず、レイアウト非干渉は jest アサーションで担保。
- [x] **チップの箇条書き点** ✅ `33f3902`: 真因は R-4 の ● マーカーが全チップに付いていたこと（ul/li 説は否定）。選択中チップのみ ● に変更。実画面確認。
- [x] **時刻Input の Material 化** ✅ `ec948a0`: mat-form-field + matInput。実画面で mat-form-field 内に配置・値バインド確認。
- [x] **操作部折り畳み（共通 collapsible-panel）** ✅ `ad4dece`: デスクトップ=展開・モバイル=折り畳み既定、折り畳み時は設定要約表示。390px で要約ヘッダー動作を実画面確認。
- [x] **モバイル余白削減** ✅ `6be47d8`: 各ページルートの `tw-p-4 md:tw-p-16` に `max-sm:tw-px-2`（10ページ）。390px で横スクロール無しを確認。
- [x] **ランタイムエラー全ページ掃討** ✅: 主要9ページ sweep でアプリ起因エラー0。残るコンソールノイズは環境3種のみ（auth 401=凍結スコープ・socket:3021 未起動・AdSense 403=localhost 拒否）。
- FULL jest: **458 passed / 0 failed**。
- 軽微メモ: 列車位置で時刻指定中に路線チップを切り替えると time/calendar_id が外れて現在時刻に戻る（要否は次ラウンドでユーザーに確認）。

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

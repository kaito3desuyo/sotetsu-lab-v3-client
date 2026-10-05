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
- **Angular Material（M2）に実在するコンポーネントで表現できる UI は Material を優先**。素の button/div での手組み再発明は Material に該当が無い場合のみ（2026-07-14 ユーザー追加指示。mat-button-toggle-group / mat-flat-button / mat-stroked-button / mat-chip-listbox / mat-icon-button 等をラップ+スタイル上書きで使う）
- **余白は 4px の倍数単位で設定する**（Tailwind 既定スケール tw-p-1=4px/2=8px/4=16px… を使う・`tw-p-[5px]` 等の半端値禁止）。**スマホ（`max-sm:`）は横のページ余白を「ないレベル」＝ほぼ0にする**（`max-sm:tw-px-0`・従来の `max-sm:tw-px-2` は狭く感じるため上書き。カード内部 padding は残す＝full-bleed カード＋内部余白）。2026-07-20 ユーザー追加指示。[[project_spacing_4px_mobile_flush]]
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

- [x] **T1.1 railway-day.ts 新設** — 既存コミット `bf7bfad`（`feature/redesign-2026-07` 含有・git status クリーン）で完遂済み。台帳記載漏れを 2026-07-13 に是正。`Tests: 18 passed, 18 total` / `Test Suites: 1 passed, 1 total`（`npx jest --testPathPattern="railway-day"` 実測。4時境界・24時超え days オフセットの境界値テスト含む全 green）。逸脱: なし（既存10箇所の置換なし・新規ファイルのみ）。**環境注記**: `npm test`(ng-test ラッパー)は sandbox で全 spec 共通クラッシュ(`Cannot set base providers because it has already been called`／未関係 spec でも再現＝環境既存問題)のため `npx jest` 単体で検証。
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

## P5 仕上げ（想定 1〜2 コミット） ✅完了（2026-07-13・T5.1 `bde300b` / T5.2 `2cdfb91`）

- [x] **T5.1 ペイロード実測 + Lighthouse** — commit `bde300b`（記録: `.context/redesign-2026-07/50-p5-measurements.md`）。2026-07-13 実測（Playwright 実アプリ捕捉 + `npx lighthouse`、localhost は dangerouslyDisableSandbox でユーザー明示許可下）。**trip-blocks 上下合計 12,203,800 B ≈ 11.64 MiB（非圧縮・content-encoding 無し）/ 並列取得 約6.2s**（tripDir=0: 6,072,037B/3,673ms・tripDir=1: 6,131,763B/6,216ms、calendarId `de94e6b3-…`）。**Lighthouse モバイル: Performance 0.53 / FCP・LCP 57.1s / TBT 150ms / CLS 0.041**（dev ビルド + 実スロットリングのため極端値・参考）。逸脱: ①before ベースライン不在のため after 単発（D-7 は元々「最初期実測」指定でスコープ内）②`--preset=perf` の実スロットルで既定30s FCP 窓を超え NO_FCP → `--max-wait-for-fcp` のみ延長（失敗出力を記録に明記）③chrome-launcher が cwd に作った stray dir を掃除。**DoD（記録ファイル + 具体数値）達成**。
  - 対象: `.context/` に計測結果を記録
  - 参照: `30` §6.3 / `35` §6（D-7 判断材料）
  - DoD: trip-blocks 上下合計サイズ・取得時間、改善前後 Lighthouse(モバイル)を記録
  - 検証: 記録ファイル存在 + 数値記載

- [x] **T5.2 品質フロア一括（R-5〜R-8）** — commit `2cdfb91`。2026-07-13。`Tests: 490 passed, 490 total` / `Test Suites: 114 passed, 114 total`（`npx jest` 実測・直近 458/0 を上回り回帰ゼロ）。lint 101 problems は変更前後で不変＝全て変更ファイル外の既存無関係エラー。Playwright 目視（390px・dangerouslyDisableSandbox 明示許可下）: focus-visible=navy 2px outline 表示確認（mat-icon-button 含む）/ reduced-motion=サイドナビ開閉 290ms→22ms 短縮を実測。**修正内容**: R-5=選択チップ/出庫入庫バッジ/検索ボタンのオレンジ地文字を 15px+bold 化 / R-6=`prefers-reduced-motion` 時にサイドナビ開閉アニメ無効化 / R-7=列車位置の免責文言短縮 / R-8=`:focus-visible` グローバル化(Material `outline:none` 衝突のため `!important`)+9ファイルに `tw-tabular-nums`。逸脱: R-6 実装方式を当初 app.config.ts の DI 切替 → `layout.component` の `[@.disabled]` バインドへ変更（BrowserAnimationsModule 競合回避・jest/lint 裏付け済み）。それ以外逸脱なし。
  - 対象: 全ページ横断（トークン適用確認）
  - 参照: `25` R-5/R-6/R-7/R-8
  - DoD: オレンジ地文字 15px+bold 限定 / 動き 4 種限定 + reduced-motion / 文言短縮 / focus-visible・tabular-nums・44px タップ
  - 検証: `npm test`・lint / Playwright で focus-visible・reduced-motion 目視

---

## P6 モック忠実度是正ラウンド（2026-07-14 開始・ユーザー指示「モックに忠実でない実装を修正したい」）

> 一次リスト: `.context/redesign-2026-07/97-mock-fidelity-audit-2026-07-14.md`（S1=機能破損 A1〜A5 / S2=乖離 B1〜B11）

- [x] **T6.1 モック忠実度監査** — 全12モック × 実画面（390px・実データ）目視比較完了。S1×5・S2×11 を検出。97 に記録。コミット対象なし（.context のみ）／逸脱なし
- [x] **T6.4 精密監査→全数タスク化（2026-07-14）** — ユーザー指示（ピクセル準拠・既存デザイン流用禁止・作り直し前提・UX重視）を受け、全12モックを**要素単位**で再精査（列車入力フォーム本体・過去運用マトリクス実検索・行路図ワイド検証を追加取得）。`98-pixel-fidelity-gaps-2026-07-14.md` に横断 G0＋ページ別 G1〜G12 を記録し、下記 T6.5〜T6.17 に全数タスク化。**実装なし（台帳追加のみ・ユーザー指定）**。コミット対象なし／逸脱なし
- [x] **T6.2 A1: 全線時刻表の時刻表示修正** — コミット `790bfa0`。`Tests: 490 passed, 490 total`（全体・回帰ゼロ）/ timetable-all-line 単体 `Tests: 18 passed, 18 total`。真因: `_formatTime()` が1桁時（3桁結果）に誤って先頭 `-` を付与→「-458」。Playwright 実画面で hyphenCount 0・「458/507」形式を確認（2026-07-14）。**逸脱**: A1 の主症状「セル大半が‥」は誤診断と判明——実 DB 検証（times.station_id 一致）＋列ごと時刻セル数実測（全10列に7〜27個）により、全路線ON既定×約230駅軸×各列車の停車駅約18の**数学的に妥当な疎**。モックのセル値は例示データ。コードのロジック変更なし
- [x] **T6.3 A2: 運用行路図の描画崩壊修正** — コミット `04a9c80`。`Tests: 496 passed, 496 total`（全体・baseline 490 超・回帰ゼロ）/ route-diagram 単体 `Tests: 22 passed, 22 total`。真因2点: ①B5「隠れ駅を飛ばして再接続」が未実装で、絞り込みで消えた駅を端点に持つ行路の座標が NaN→不可視（`reconnect-trip-operation-lists.util` 新設で解消）②外側 div の `max-h-[60vh] overflow-auto`（redesign 以前からの既存）がダイヤをクリップ→ページ展開+横スクロールへ。Playwright 実画面検証（2026-07-14）: 駅14列（横浜/湘南台/新横浜含む）・帯20本超・回送点線・入庫△・両端時刻を確認、390px で body 横スクロールなし。逸脱: なし
- ~~バックログ（97 が一次リスト）~~ → **2026-07-14 ユーザー指示で基準引き上げ・T6.4 で全数タスク化済み（下記 T6.5〜T6.17）。97 の A3/A4/A5・B1〜B12 は該当タスクに統合済み**

### P6 忠実度基準（2026-07-14 ユーザー指示・交渉不可）

- **余白などを除きピクセルパーフェクト近傍**をモック（`mockups/mockup-NN.jpeg`）に対して目指す。**既存コンポーネントデザインの流用禁止・作り直し前提**。UX も同格の要件
- 一次資料: `.context/redesign-2026-07/98-pixel-fidelity-gaps-2026-07-14.md`（要素単位ギャップ台帳。各タスクは該当 G 節を必ず Read）
- ただし**確定済みユーザー判断はモックより優先**（98 冒頭の一覧: 線色 tripClassColor 維持・チップ自社線に絞らない・collapsible-panel・実群名バッジ・情報削減禁止 等）
- 98 §末尾の「新規判断①〜⑥」は各タスク内で保守的既定を採り、台帳末尾「溜まった新規判断」へ追記して続行

### P6 タスク群（実行は 2026-07-15 以降のセッション。1タスク=1サブエージェント=1コミット。順序どおり直列）

- [x] **T6.5 デザインシステム部品基盤（G0）** — コミット `4657567`（差し戻し1回込み・amend済み）。`Tests: 514 passed, 514 total` / `Test Suites: 118 passed, 118 total`（baseline 496→回帰ゼロ・新規18テスト）。変更: filter-chips 角型化（2px+選択紺塗り✓。M2が`--mat-chip-container-shape-radius`を要素直指定するため構造クラスへ明示CSS）/ segment-toggle・app-button・ad-placeholder 新設 / app.config outlined 既定化 / header リロードアイコン（「ようこそ」維持）/ 本文ページ名見出し5ページ削除（実タグは h2.mat-h2）。Playwright 実測検証済（2026-07-14・radius 2px / 選択bg rgb(0,21,86)+✓ / h1はheaderのみ / 広告374×102）。逸脱: (a) 初回報告の「G0-5解消済み」「Playwright不可」は管理者検証で覆り差し戻し→解消 (b) past-time/route-diagram の header 子コンポーネントは削除でなくテンプレート空化（ページ再構築 T6.12/T6.14 で吸収）(c) segment-toggle/app-button のページ組込は後続ページタスクで実施
  - 対象: `shared/`（filter-chips 刷新・全幅セグメントトグル新設・ボタン規約・outlined フォーム全域適用・広告プレースホルダ）+ layout ヘッダー（リロードアイコン追加。「ようこそ」維持）
  - 参照: 98 §G0（G0-1〜G0-9）/ モック 01/03/05/10
  - DoD: 角型チップ（選択=紺/オレンジ塗り+✓・disabled=灰）・全幅2セグメントトグル・オレンジ主/白地紺枠副ボタン・M2 outlined 既定化・ページ見出し h1 重複の削除。既存利用箇所の視覚回帰は各ページタスクで吸収
  - 検証: `npx jest` 回帰ゼロ + Playwright 390px で部品ギャラリー的に確認
- [x] **T6.6 共通カード3種の作り直し（G4）** — コミット `4ecef55`（差し戻し1回込み・amend済み）。`Tests: 514 passed, 514 total` / `Test Suites: 118 passed, 118 total`（回帰ゼロ・ng build prod も exit 0）。変更: 投稿カード=編成番号/車両番号セグメントトグル・運用番号select化(本日運用+休100)・投稿するオレンジ全幅(実測342px=カード内幅)・現在時刻/時刻指定セグメント化・時刻フィールドは時刻指定時のみ表示 / 検索カード=上り/下り全幅セグメント+検索オレンジ全幅 / 運用情報カード=リンク紺下線+運用表/行路図ボタン白地紺枠。Playwright 実測検証済（2026-07-14・3カードともモック10比較）。**逸脱（重要）**: 98 §G4 の「編成番号/車両番号トグル復元」は git 全履歴調査で誤りと判明——radio は一度も存在せず（1576d66→2c33b47→7cfcfe5）、v3 API は `formationOrVehicleNumber` でサーバー側 OR 解決。よってトグルはラベル切替 UI として新設（機能・API 不変・誤データ経路なし）。他: app-button に fullWidth 入力追加（既定true・非破壊）
  - 対象: 時刻表検索カード / 運用情報投稿カード / 運用情報カード（01/02/03/04/05/13 の下部共通）
  - 参照: 98 §G4 / モック 10
  - DoD: 投稿カードの**編成番号/車両番号トグル復元**・運用番号 select 化・「投稿する」オレンジ全幅・リンク/ボタンのモック準拠。機能（API 呼び出し・バリデーション）は不変
  - 検証: `npx jest` + Playwright でモック 10 と3カード突き合わせ
- [x] **T6.7 リアルタイム運用情報の作り直し（G2・旧 A3/A4/B6/B11 統合）** — コミット `9d3cc56`。`Tests: 517 passed, 517 total` / `Test Suites: 118 passed, 118 total`（baseline 514→回帰ゼロ・新規3・lint 既存105不変）。**「休」単独問題の真因**: elf-persist-state の非同期復元が `{...state,...snapshot}` 後勝ちマージでフェッチ済みデータを旧空スナップショットで上書き＋群フェッチがチェーン末尾でエラー分離なし→永続化をフィルタ選択・トグル5キーに限定（復元時サニタイズ）・群フェッチ先頭化・try/catch 追加で解消。Playwright 実測検証済（2026-07-14）: 群チップ5群+休表示・会社選択=紺(0,21,86)✓/群選択=オレンジ(238,123,53)✓の2系統・トグル3個1行・「絞り込み（表示のみ…）」1行統合・カード=mockup-02 準拠（現在位置行=下線種別リンク+区間・目撃/更新ラベル+赤/緑時刻・出庫前○「・」/入庫済△・順送り「16?」下線）・凡例に「休」/○/△/? 4行追加（既存5行維持）・編成順タブ良好。逸脱: (a) 形式付記に「系」付与（旧コード内コメント「系/形表記は避ける」をモック優先で覆した→溜まった新規判断に記載）(b) 出庫前の矢印→「・」区切り（モック準拠・情報削減なし）(c) ページ内フェッチ順変更（initialDataResolver 不変）
  - 対象: `pages/operation/operation-real-time/`
  - 参照: 98 §G2 / モック 02 / `10-spec` B2/B3
  - DoD: **群チップ復旧（groups API 5群を表示）**・**モバイルカードに現在位置行復活**（下線種別リンク+区間。情報削減違反の解消）・トグル3個を1行コンパクト化・凡例に休車/○/△/? 行を追加・カード構成をモック準拠に
  - 検証: `npx jest` + Playwright 実データ（チップ6個・現在位置行の実表示）
- [x] **T6.5補 Material ラップ差し替え（2026-07-14 ユーザー指示）** — コミット `ce5ca46`。`Tests: 517 passed, 517 total` / `Test Suites: 118 passed, 118 total`（回帰ゼロ）。方針「M2 に実在する部品は Material 優先・手組み再発明禁止」を受け、T6.5 新設部品を棚卸し→手組み2部品のみ内部差し替え: segment-toggle=`mat-button-toggle-group` 化 / app-button=`mat-flat-button`(主オレンジ)+`mat-stroked-button`(副白地紺枠) 化。public API 完全維持（利用側 diff ゼロ）。filter-chips=mat-chip-listbox 維持・リロード=mat-icon-button・広告PHは Material 該当なしで対象外。Playwright 実測: トグル全幅344px/2等分/選択紺・検索342pxオレンジ・副ボタン白地紺枠——差し替え前と同一。方針は「絶対の制約」と memory に恒久化済み。逸脱: spec 2件の正当な追随（aria-checked / バリアントクラス assertion）。**環境注記**: コンテナ watcher が「ts変更→scss新規作成」の順序レースで一度ビルド失敗し停止したまま古いバンドルを配信し続けた→対象 ts を `touch` して再ビルドを蹴ると解消（新規ファイル追加を含むコミット後は要注意）
- [x] **T6.8 駅別時刻表の作り直し（G1・旧 A5 統合）** — コミット `ddee204`（差し戻し2回込み・amend済み）。`Tests: 525 passed, 525 total` / `Test Suites: 121 passed`（baseline 517→回帰ゼロ・新規8）/ 単体 `Tests: 13 passed, 13 total`。変更: 充当編成の紐付けを operation-real-time 同一の Record 方式化＋fetchTripBlocks を324件の findOneById forkJoin→findManyByFilter バルク1リクエスト化 / 駅・ダイヤ select 横並び / segment-toggle / 時間帯交互シェーディング / 通し運行脚注行（記号 ⬎→↪）/ 内部スクロール `max-h-[70vh]` 撤去→ページ全開。Playwright 実測検証済（2026-07-15）: 初回ロードのみで「不明」4件=全て37Gのデータ由来（切替後も4件で一致・race なし）・脚注は二俣川上りで248件実表示（「↪ 新横浜から渋谷まで（急行 058052）」）・横浜の脚注0件は multi-member block 0件のデータ由来（613 blocks 全走査裏取り）・5〜0時全開・アプリ起因 console エラー0。**差し戻し経緯**: ①初回報告の「脚注行は実装済み」は表示実証なし→追実装+実データ確定例の裏取りを要求 ②bulk 置換初版が初回ロードで「不明」252件の race 回帰（crossSections の mergeMap が1失敗で全滅+6MB バルクの後段配置）→ per-request catchError+取得順逆転で解消。逸脱: agent 初回提示の実データ例（6436/6438）はローカル compose の 2022年DB 誤参照で撤回（稼働 API は Supabase 接続）
- [x] **T6.9 全線時刻表の作り直し（G5・旧 B9 統合）** — コミット `c630341`（差し戻し1回込み・amend済み）。`Tests: 530 passed, 530 total`（baseline 525→回帰ゼロ・新規5）/ 単体 `Tests: 18 passed, 18 total`。変更: 内部縦スクロール廃止→ページ全開 / 種別行を tripClassColor 色文字+短縮名（`shared/trip-class-short-name.util/.pipe` 新設・selectは正式名維持）/ ページネーション1行化。Playwright 実測検証済（2026-07-15）: ページ全開 8230px・内部スクロール要素0・ページネーション1行「1-10/928」（旧0/0バグ消滅）・種別行「各停」×色 teal(0,150,136)/blue(48,79,254)・「各駅停車」残存0・二重線143セル・操作4行ラベル（編集/コピー/削除/グループ）・↓記号283件（件数100時）・sticky529セル・アプリ起因consoleエラー0。¬ 0件はデータ依存（着発同一折返しが該当ページに無し）と判定。差し戻し経緯: 初回報告「短縮名は既存準拠済み」が実測で「各駅停車」正式名残存と判明→表示層マッピング追実装。逸脱: 広告枠は raw `<ng-adsense>` 据え置き（app-ad-placeholder 未移行・他ページ横断のため対象外）
- [x] **T6.10 列車位置情報の作り直し（G8・旧 B4 統合）** — コミット `a479e59`（差し戻し1回込み・amend済み）。`Tests: 541 passed, 541 total`（baseline 530→回帰ゼロ・新規11）/ 単体 `Tests: 104 passed, 104 total`。変更: 軸密度をモック09相当に再設計（docH 1926px・従来比大幅圧縮）/ カード衝突回避レイアウト（`resolve-between-row-layout.util` 新設・純関数テスト付き）/ 方面表記「◀上り（横浜方面・在線 左側）」（モック文言+現行補足併記）/ 停車中はカード内「停車中」表記（モック準拠・方向は左右配置で保持）/ 免責文をページ最下部 footer に常設化。Playwright 実測検証済（2026-07-15）: カード17枚・重なり0・停車中2件・免責「ダイヤ通りに走った場合の位置です。実在線は リアルタイム運用情報へ。」が footerBottom=docH=1954px で常設・運用番号/会社/乗換リンク維持・アプリ起因 console エラー0。差し戻し経緯: 初回は免責文が操作部パネル内のみ（モバイル折り畳みで不可視）→ G8「最下部固定」準拠の footer 新設で解消（パネル内文言も維持・情報削減なし）。逸脱: 「編成」プレフィックス削除（値は無加工・モック09準拠）・停車中カードの▲▼を「停車中」に置換（モック準拠）
- [x] **T6.11 ダイヤグラムの作り直し（G7・旧 B3 統合）** — コミット `0bd902b`（差し戻し1回込み・amend済み）。`Tests: 546 passed, 546 total` / `Test Suites: 123 passed, 123 total`（baseline 541→回帰ゼロ・新規5）。変更: diagram-scale に `enforceMinimumRowGap`（駅軸ラベル最小行高確保）+ junction-duplicate min-fallback（空白帯解消）/ train-diagram-chart にピクセル空間の共有軸（駅行と列車線を同一軸に）/ 凡例を auto-fill スウォッチグリッド化 / 情報パネルに目撃日付追加 / ダイヤ・時間帯 select を横並び+短縮ラベル。**管理者 Playwright 実測検証済（2026-07-16・390px 実データ）**: ①駅軸ラベル新横浜〜海老名まで重なりなし判読可 ②いずみ野線↔本線の空白帯解消 ③凡例4列グリッド18項目 ④タップパネル=カード「各停 6227/海老名 行/82/編成 130/この列車の詳細へ›/×」がモック08構造一致 ⑤ダイヤ/時間帯 select とも y=92 同一行横並び ⑥アプリ起因 console エラー0。**差し戻し経緯**: 初回検収で実画面に **NG1010（train-diagram-controller.component.ts:63 の imports 静的評価不能）**のエラーオーバーレイ→パネル全体が非表示。同一エージェント調査でコミット済ソースの imports は元々リテラルと判明＝`ng serve` の多段編集中の増分キャッシュ残骸が真因。型専用 import を `import type` 化してハードニング・amend。管理者がリロード再検証しオーバーレイ消滅を実測。逸脱: (a) 凡例は auto-fill グリッドで390px実測5行（G7目標「2〜3行」は18項目のため未達だが flex-wrap 6行超からは改善） (b) 情報パネルはモックの浮遊カードでなく下部固定シート位置を維持（内容はモック準拠・位置は G2/G8 と同じ保守的既定）
  - 対象: `pages/train-diagram/`
  - 参照: 98 §G7 / モック 08 / `15-spec` N1
  - DoD: **駅軸ラベル重なり解消**・軸空白帯の解消・凡例17項目のコンパクトグリッド化・タップ情報パネルをモックのカード型に。線沿いラベルは不採用（新規判断⑤の保守的既定）
  - 検証: `npx jest` + Playwright 実データ（ラベル判読性・モック 08 比較）
- [x] **T6.12 運用行路図 SVG の全面刷新（G6・旧 B12/B8 統合）** — コミット `4c6e22d`（差し戻し1回込み・amend済み・本文も実装準拠に修正）。`Tests: 584 passed, 584 total` / `Test Suites: 126 passed, 126 total`（baseline 546→回帰ゼロ・新規38）/ 単体 route-diagram `Tests: 60 passed, 60 total`。変更: 帯を角丸矩形(rx=6)化し `classify-band-style`/`fit-columns`/`build-band-view-models` util 新設。帯内「列番 種別 行先」+両端発着時刻・出庫入庫オレンジタグ(#ee7b35/#ff9800)+○/△・borderAfterStation 再利用で二重縦罫線・PNG は隠しSVGが同一 bandRows() 参照で追随。**管理者 Playwright 実測検証済（2026-07-16・390px 実データ・複数運用）**: ①11運=全28帯 fill #ffffff（塗り帯ゼロ）②**12運「3037 特急」/51運「通勤急行・特急」/61運「特急×3」を含む全4運用で filledBands=0**＝優等帯も白地+tripClassColor枠（モック04一致を裏取り）③390px フィット（body横スクロール無し・scrollW=390）④出庫入庫オレンジタグ+○/△⑤二重縦罫線⑥回送点線⑦PNGボタン「画像としてダウンロードする」存在⑧アプリ起因エラー0。**差し戻し経緯（重要な裁定）**: サブエージェントが「モックをピクセルサンプリングすると優等帯は白地紺枠に見え、98 §G6 の『優等=紺塗り白字』と食い違う」と正直に申告→管理者がモック04帯領域を ffmpeg で3倍拡大し**モックは優等帯も白地＋種別色枠（紺塗り白字は存在しない）と実ピクセルで確定**。P6基準「モックへのピクセル忠実（交渉不可）」＋確定判断「線色 tripClassColor 維持」に照らし express=塗り分岐を撤去させ全旅客帯を白地枠に統一。逸脱: なし（§G6 の「優等紺塗り」記述誤りは下記「溜まった新規判断」に記録）
  - 対象: `pages/operation/operation-route-diagram/`（T6.3 の reconnect 基盤の上に）
  - 参照: 98 §G6 / モック 04 / `10-spec` B5
  - DoD: 帯=角丸矩形+種別×塗り言語（優等紺塗り/白地色枠/回送点線）・帯内「列番 種別 行先」・出庫入庫オレンジタグ+○/△・**390px 全駅フィット**・境界二重縦罫線・PNG 出力追随
  - 検証: `npx jest` + Playwright 実データ 11運（モック 04 比較）
- [x] **T6.13 列車情報入力の作り直し（G9・乖離最大）** — コミット `a7bab0f`（差し戻し1回込み・amend済み）。`Tests: 602 passed, 602 total`（baseline 584→回帰ゼロ・新規18）/ 単体 timetable-edit-form `Tests: 49 passed, 49 total`。変更: 2×2 outlined ヘッダー（種別=色バッジ入り select）・初期値取り込みブロック（既存列車からコピー mat-menu＋一括オフセット欄＋プリフィル説明）・1駅1行の停車駅リスト（停/通はタップ循環トグル・経由なし radio 廃止）・路線チップ collapsible-panel・sticky 下部バー（下書き保存 outlined＋この列車を登録 orange）。**管理者 Playwright 実測検証済（2026-07-16・390px 実データ・add/copy 両モード）**: ①2×2 outlined＋種別選択で in-select オレンジバッジ（tripClassColor）②初期値取り込みブロックの3要素表示③sticky フッター「この列車を登録」ラベル表示④停/通トグル（「—」タップ）⑤個別保存モード/1-N ページャ/入庫出庫 維持⑥app-button 共通部品の他ページ（real-time「投稿する」・route-diagram「画像としてダウンロードする/運用表/行路図」）回帰ゼロ⑦アプリ起因 console エラー0。**差し戻し経緯（2件）**: (a) sticky フッター submit ボタンのラベルが空描画→真因は `app-button` が `@if/@else` 各ブランチに素の `<ng-content>` を二重配置し補間 `{{submitButtonLabel()}}` が片アウトレットにしか結ばれず→`<ng-template #content>`＋`[ngTemplateOutlet]` に集約（**共通部品修正のため全ページ app-button 回帰を管理者が確認**）。(b) 初期値取り込みブロックが DOM 不在→真因は `@if(isCopyMode())` で ADD 非表示＋オフセット欄 `ngModel` の `FormsModule` 未 import で NG0201→表示条件を ADD+COPY へ・FormsModule import。逸脱: (i) 行先は API 新フィールドでなく times 最終停車駅から導出の読み取り専用（保存契約非破壊）(ii) 停/通はラジオでなくタップ循環トグル（DoD の経由なし radio 廃止方針）(iii) コピーは mat-menu 化 (iv) 初期値取り込みブロックの配置がモックは 2×2 ヘッダーの下、実装は上（全要素表示・情報欠落なしの軽微な順序差）(v) **update モードは trip_block_id 取得手間で視覚未検証**（add/copy は視覚検証済・update は submitButtonLabel() のモード分岐＋jest 49 でカバー）
  - 対象: `pages/timetable/timetable-edit-form/`
  - 参照: 98 §G9 / モック 06 / `10-spec` B8
  - DoD: 2×2 outlined ヘッダーフィールド・**1駅1行の停車駅リスト**（経由なし radio 廃止=チップ絞り込みで代替）・コピー+一括オフセットの1ブロック統合・**sticky 下部バー**・入庫出庫/個別保存モード/ページャは情報維持
  - 検証: `npx jest` + Playwright（add/copy/update 3モード・モック 06 比較）
- [x] **T6.14 過去の運用情報の微修正（G11）** — コミット `69770d5`。`Tests: 602 passed, 602 total`（全体・baseline 602 維持＝回帰ゼロ）/ 単体 `Tests: 19 passed, 19 total`。変更5ファイル（search-form ts/scss/html + table ts/html）: 検索行1行化（基準日+日数+検索を1行）・検索ボタンを共有 `app-button` 化・マトリクスの内部縦スクロール撤去→ページ全開・検索前空状態に `empty-state` 部品適用。**管理者 Playwright 実測検証済（2026-07-16・390px 実データ）**: ①検索前=虫眼鏡+「基準日と日数を設定して検索してください」の empty-state 表示・内部スクローラ0・横スクロールなし ②検索後（2026/07/15・30日）=マトリクス1テーブル描画・内部スクローラ0＝ページ全開（docH 5250px）・sticky 編成行+日付列・複数目撃/赤枠/群色背景 全維持（情報削減なし）・選択チップ「相鉄」＝紺塗り✓可視化・下部運用情報カード維持・アプリ起因 console エラー0。**逸脱**: ①検索ボタン app-button 化でフォントを本ページ独自15px→共有部品既定14px に統一（確立済み規約への追随） ②基準日フィールドの装飾サフィックス「から」削除（書式テキスト・情報削減対象外）。**検収注記**: 初回ロードで NG1010（search-form.component.ts:45 imports 静的評価不能）のエラーオーバーレイを確認したが、対象 ts を touch し再ビルドで消滅＝`ng serve` 増分キャッシュ残骸と確定（コミット済ソースは正常・jest緑・T6.11/T6.5補と同型）。`import type` ハードニングは実害軽微のため見送り（要否はユーザー判断待ち）
  - 対象: `pages/operation/operation-past-time/`
  - 参照: 98 §G11 / モック 13
  - DoD: 検索行1行化（基準日+日数+検索）・チップ選択可視化・マトリクスのページ全開・検索前空状態に empty-state 部品
  - 検証: `npx jest` + Playwright 実データ検索（モック 13 比較）
- [x] **T6.15 運用表の微修正（G3）** — コミット `2410f4c`（差し戻し1回込み・`f2e8be0`→amend）。`Tests: 602 passed, 602 total`（全体・baseline 602 維持＝回帰ゼロ）/ 単体 `Tests: 32 passed, 32 total`。変更2ファイル（operation-table-filter.html：ダイヤ select を `yyyy.M改正` 短縮表記化・ジャンプ幅 tw-w-28→tw-w-32 / operation-table-card.html：通常ノードを紺枠白抜き丸化、出庫入庫はオレンジ塗り維持）。**管理者 Playwright 実測検証済（2026-07-16・390px 実データ）**: ①ダイヤ select「2026.3改正 平日ダイヤ」truncate なし ②ジャンプ拡幅 ③タイムラインノード＝紺枠(border 2px solid #001556)白抜き丸が各停車点に可視・出庫点はオレンジ塗り丸（モック03一致）④種別色(快速=青/各停=黒)・回送/出庫バッジ・群色・「行路図を見る›」リンク・全30本 全維持（情報削減なし）⑤横スクロール/オーバーレイ/アプリ起因エラー0。**差し戻し経緯**: 初版はノードに `tw-bg-white tw-border-2 tw-border-primary-500` を付けたが preflight 無効で border-style が none に落ち枠が描画されず白抜き丸が不可視（従来の紺塗りより視認性悪化＝情報削減）→ 管理者 Playwright の computed style 実測（border-top-style:none / width:0px）で捕捉 →`tw-border-solid` 追加で解消（[[project_tailwind_border_needs_solid]] にメモリ化）。逸脱: なし（補足: DoD「ジャンプ select 短縮表記」の G0-7 該当はダイヤ日付短縮で、ジャンプ幅拡張と併せ両方実施。ノードから装飾 tw-ring-white 除去＝モック03準拠）。チップ可視化は共有 filter-chips.scss+ページ限定 operation-table-filter.scss で既に✓オレンジ塗り済みのため現状活用
  - 対象: `pages/operation/operation-table/`
  - 参照: 98 §G3 / モック 03
  - DoD: ジャンプ select の truncate 解消（短縮表記 G0-7）・チップ選択可視化・タイムラインノード白抜き丸化
  - 検証: `npx jest` + Playwright（モック 03 比較）
- [x] **T6.16 ダッシュボードの微修正（G10・旧 B7 統合）** — コミット `f3f576f`。`Tests: 602 passed, 602 total`（全体・baseline 602 維持＝回帰ゼロ）/ 単体 `Tests: 18 passed, 18 total`。変更2ファイル（dashboard-quick-tiles.component.{html,ts}）: 列車位置情報タイルをオレンジ化。**管理者 Playwright 実測検証済（2026-07-16・390px 実データ）**: ①クイックタイル4のうち列車位置情報のみオレンジ(他3=紺)②ヒーロー背景=紺8%斜線ハッチ（line stroke #001556 stroke-opacity 0.08 を876 stroke 中に実測）＋赤現在時刻ライン（line stroke #d9534f opacity 0.5・22:59位置に縦線を視認）③最新目撃3行フラット（枠なし「36K 3121 武蔵小杉→目黒 22:15」等）④今日の状況の全数値（日付/平日ダイヤ 2026.3.14改正/時計/走行41/目撃114）・クイックタイル4 維持（情報削減なし）⑤横スクロール/オーバーレイ/アプリ起因エラー0。**逸脱**: なし。**検収注記**: サブエージェントは「ヒーロー背景（斜線+赤線）・最新目撃フラットは既存コミット（745492c 等）で既にモック11準拠」と主張→台帳鉄則に従い実画面で裏取りした結果、**今回はいずれも真**（斜線 stroke-opacity 0.08 / 赤線 #d9534f / フラット行を実測確認）。新規実装はタイルのオレンジ化のみで正当
  - 対象: `pages/dashboard/`
  - 参照: 98 §G10 / モック 11
  - DoD: 列車位置タイルのオレンジ化・ヒーロー背景を紺8%斜線+赤現在時刻ライン・最新目撃3行のフラット化
  - 検証: `npx jest` + Playwright（モック 11 比較）
- [x] **T6.17 空状態の徹底適用（G12・旧 B10 統合）** — コミット `b4e0434`（初版 `09afc77` を差し戻し1回込みで amend）。`Tests: 603 passed, 603 total`（全体・baseline 602＋新規spec1＝回帰ゼロ）。変更: 6ページ（駅別/全線/過去運用/行路図/ダイヤグラム/列車位置）の各 component.{html,ts} に empty-state 部品を適用＋共通 empty-state 部品に subtitle 入力を非破壊追加。**管理者 Playwright 実測検証済（2026-07-17・390px 実データ・dangerouslyDisableSandbox 明示許可下）**: ①駅別=列車アイコン+「この条件の列車情報はありません」+補足「ダイヤまたは方向を変えてお試しください。」+「下り時刻表を表示する」②全線=同（0本ケース・旧0/0バグ無し）③過去運用=虫眼鏡+「基準日と日数を設定して検索してください」+「本日から7日間を検索する」④行路図=折返しアイコン+「運用番号を設定して検索してください」+「運用表を見る」⑤ダイヤグラム=ダイヤ線アイコン+同見出し+「表示条件をリセットする」⑥列車位置=現在時刻モード・在線0本で列車アイコン+「現在この路線を走行中の列車はありません」を駅ライン上に重畳（駅軸は維持）。6ページ全てローディング残留なし・ページ生存を実測。**差し戻し経緯（管理者検収が捕捉）**: 初版 `09afc77` は (i) 列車位置の isEmpty が「駅軸0件」トリガ＝単一選択路線では軸が空にならず**到達不能な死にコード**で、現実的な空ケース（在線0本）が素の駅ライン＋メッセージ皆無だった → `positions()`0件判定＋駅ライン常時表示＋メッセージ重畳へ是正（ユーザー裁定）(ii) 駅別/全線の空状態が mockup-07 の補足文2行目を欠落 → empty-state 部品に subtitle 追加で復活（ユーザー裁定）。**spec 改変の裁定**: train-location.spec は新規テスト1本（在線0本で `app-train-location-line` 残存 && `app-empty-state` 重畳を両アサート）＋旧ロジック用の陳腐化 setup 削除で、管理者が diff 検証——アサーション削除・skip・水増しなし・602→603 は新規1本と整合＝green 偽装でなく正当な追随。**逸脱**: 全線時刻表の「カレンダー未選択」edge（直接URL操作時のみ・通常導線は常に calendar_id 付与）は対象外とし「0本」ケースのみ対応（既存ロード分岐テストの回帰回避）
  - 対象: empty-state 部品の全データ空文脈への適用（駅別/全線/過去運用/行路図/ダイヤグラム/列車位置）
  - 参照: 98 §G12 / モック 07
  - DoD: アイコン+説明+次アクションの3点セット・ローディング残留なし（C1 準拠）
  - 検証: `npx jest` + Playwright（空データ条件を作って確認）

## P7 実DB移行準備（api / 撤去前提コード・sandbox 完結・実DB不要） ✅コード面完了（2026-07-17）＋ローカル実DB予行演習成功（2026-07-19）

> **ローカル実DB予行演習（2026-07-19・ユーザーが .env.local をローカル `development-db` に向け替え・管理者が docker exec で実行・dangerouslyDisableSandbox）**: migration→3シード→検証を全通し。**成果**: ①`migration:run` で calendar_dates 作成成功 ②内閣府CSV取得・配置（`db/seeds/data/syukujitsu.csv`・SJIS・1955〜／1067件パース）③holiday=644・newyear=104(挿入予定134→元日重複30が ON CONFLICT スキップ＝冪等)・special=type1×10+type2×6 を投入、**総 764 件**（type1運行384/type2運休380）④**日付範囲 2009-11-03〜2027-11-23＝過去年も未来年もカバー**（過去祝日欠落の懸念解消）⑤**特別日2021-10-23 に type1(特別カレンダー運行)+type2(通常カレンダー運休)の両方を実データ確認＝T7.2 発見のバグ修正が実DBで機能**⑥祝日シード再実行で件数不変＝冪等確定。
> **予行演習で追加バグ検出→修正**: シードスクリプト本体（holidays/newyear/special）が ts-node 実行時に TS2345（`insertCalendarDateRows` の rows 型 `exceptionType: number` vs TypeORM `.values()` 要求の `CalendarDateExceptionType`）で落ちた。**シードは一度も実行されておらず jest は純関数のみ対象だったため未検出**。→ rows 型を `CalendarDateSeedRow[]` に統一して修正（api コミット `ed26716`・jest 19 passed・TS2345 消失を stash 前後で実証）。
> **memo 改善（2026-07-19・ユーザー指摘）**: 祝日 memo を一律 `'祝日'` から**具体的な祝日名**（元日/成人の日/…、振替休日・国民の休日は内閣府CSV表記の `休日`）に変更（api `bbc32bc`・`buildHolidayCalendarDateRows` に任意 `holidayNameByDate` を非破壊追加・等価ゲート無改変で判定不変・jest 17 passed）。ローカルDBを truncate→再シードし memo に祝日名が入ることを実地確認（type1/type2 両方）。newyear/special memo は既存の適切表記を維持。
> **残**: (a) **内閣府CSV を repo にコミット済み**（api `426e465`・D-15） (b) 本番 .env での同手順実行（デプロイ時・memo は初回投入から名前入り） (c) T7.3 撤去（下記・予行演習成功＋等価ゲート green で de-risk 済み）。

> D-13 の calendar_dates 撤去を安全化するための先行コード作業（2026-07-17 ユーザー指示「先に仕込んでおいて」）。実DB実行を待たず sandbox 内で jest まで通す。**T7.1・T7.2 とも完了**（`35ff172`・`f54221f`）。副産物として T2.3 special シードの潜在バグ（特別日の通常カレンダー除外漏れ）を等価ゲートが検出・修正済み。**撤去タスク本体（T7.3=未着手）はこの2件の green 後・実DBシード確認後に別途切る**（順序: 実DBへ migration→holiday/newyear/special シード実行→等価ゲートを実DB calendar_dates に対して green 確認→v3 CalendarQuery からハードコード判定を撤去→api 再デプロイ）。詳細前提は下記「溜まった新規判断（実DB移行 発）」を参照。

- [x] **T7.1 年末年始シード新設（漏れ①対応・A案）** — コミット `35ff172`（api）。`Tests: 6 passed, 6 total`（build-newyear 単体）/ holidays・special 併走で `17 passed`＝回帰なし / `npx tsc --noEmit` No errors。管理者検収: コミットは5ファイルにスコープ限定（`.serena` 混入なし）・`newYearDays` export 化確認・spec が年展開/有効期間交差/from-to クリップ/年またぎ境界(12-31・01-01 の正 YYYY)/type分け/無限展開ガードを実測（green 偽装でなく本物）。逸脱: 無限展開防止のエラー投げケースを spec に1件追加（安全設計担保）・それ以外なし
  - 対象: `src/libs/calendar/infrastructure/seeds/build-newyear-calendar-date-rows.ts`（新設・純関数+spec）/ `db/seeds/seed-calendar-dates-newyear.ts`（新設）/ `src/core/utils/day-of-week.ts` の `newYearDays` を export 化（最小変更）/ `package.json` に `seed:calendar-dates:newyear` script
  - 参照: 既存 `build-holiday-calendar-date-rows.ts`・`seed-calendar-dates-holidays.ts`・`seed-calendar-dates-special.ts` を範として踏襲。判定は holidays と同じ（sunday→type1 / 平日→type2）
  - DoD: `newYearDays`（MM-DD）をカレンダー有効期間 ∩ from/to の年範囲で YYYY 展開し upsert 行を生成（元日は holidays と重複するが ON CONFLICT DO NOTHING で冪等）。純関数の年展開・有効期間交差・境界の spec green。**v2 触らない・ハードコード撤去はしない**
  - 検証: api jest（対象 spec）Tests 行・型
- [x] **T7.2 完全一致検証スクリプト（撤去ゲート）** — コミット `f54221f`（api）。`Tests: 46 passed, 46 total`（calendar/infrastructure 全体・うち等価検証 spec 7・回帰なし。既存 operation-sighting.query.spec の3失敗は本タスク前から存在・無関係を stash 確認）/ `npx tsc --noEmit` No errors。旧判定は**再利用**（`CalendarQuery.prototype.buildDayOfWeekMatcher` を this 非依存で直接呼ぶ・複製なし＝検証の信頼性担保）。等価 spec は 2019(即位礼・国民の休日)/2020-2021(五輪移動)/年末年始/通常/special/過去年2014-2015/**全期間2014-2026 総合ゲート**を網羅。**重要成果: ゲートが T2.3 special シードの潜在バグを即検出し成果物側を修正**——旧経路は特別日に「全曜日false カレンダーのみ運行・通常は全運休」だが、旧 `build-special-calendar-date-rows.ts` は②「その日の曜日フラグが true の通常カレンダー（例 土曜の特別日の土休日ダイヤ）への type2 除外行」を欠き、撤去後に誤運行する欠陥だった → type2 生成を追加して旧新一致。管理者検収: コミット4ファイルにスコープ限定（`.serena`/`day-of-week`/`calendar.query` 不変）・special spec は import 追加以外**加算のみ（既存アサーション削除なし）**・修正ロジックを管理者が追跡し正当と確認。逸脱: 代表カレンダーを実データ準拠（土休日=sunday+saturday。相鉄に土曜専用は無い）に組んだ結果バグが露見（正当）
  - 対象: `src/libs/calendar/infrastructure/verification/verify-calendar-judgment-equivalence.{ts,spec.ts}`（新設）＋ `build-special-calendar-date-rows.ts` の type2 除外行バグ修正 / 実DB照合 CLI 雛形は今回見送り（実DB実行時に別途）
- [x] **T7.3 v3 ハードコード運行日判定の撤去（D-13 本体・calendar_dates 一本化）** — コミット `20fbd51`（撤去）＋ `acf0215`（未来年バグ修正）。api。`calendar.query.ts` の `buildDayOfWeekMatcher` を素の曜日規則のみに簡素化し `isHoliday`/`isNewYear`/`isSpecialCalendarAvailable` import 撤去、例外は calendar_dates(type1/type2)＋`resolveCalendarIdBySpecificDate` 単独に一本化。**等価ゲートの旧基準を `legacy-day-of-week-matcher.ts` に凍結してから撤去**（ゲートは撤去後も「真の旧ロジック⇔calendar_dates新判定」を検証＝意味を保つ）。`day-of-week.ts` 配列/関数・v2・seed・resolve-* は不変。jest 撤去時 `Tests: 52 passed`→修正後 `54 passed`・tsc/eslint clean。
    - **管理者 実DB pre/post 照合検証（2026-07-19・ローカルDB・稼働メソッド直接実行）**: 撤去前に代表7日の `findOneBySpecificDate` 結果（calendar id）をベースライン採取→撤去後に再採取し比較。**2026-12-31(年末年始)が土休日→平日に誤変化する回帰を検出**（他6日は一致）。
    - **回帰の真因（撤去でなく既存 newyear シードの穴）**: 年末年始行が 2022-12-31 までしか無く 2023 年以降欠落。現行カレンダー（`start_date=2022-03-12, end_date=NULL 無期限`）に対し `build-newyear` の年展開上限が他カレンダーの最大**有限** endDate(≈2022)に引っ張られ未来年を生成していなかった。祝日はCSV具体日付で2027まで landing していたため露見せず、**等価ゲートも無期限カレンダー×未来年末年始を検体に持たず素通り**していた。→ `acf0215` で `build-newyear` の無期限上限を `to ?? (現在年+1 フロア ∨ 他カレンダー最大endDate)` に是正＋回帰検体を build-newyear spec と等価ゲート両方に追加（**旧実装で赤→修正で緑**を実測確認＝偽装でない）。
    - **修正後の再検証（実DB）**: newyear 再シードで年末年始 2023-2027 が landing。代表**8日**（平日/日曜/祝日2/年末年始4=2025・2026・2027正月・2027年末/特別）を撤去後メソッドで採取し**全て旧挙動と一致（全 OK）**。
  - **⚠ 本番デプロイ順序（厳守）**: 撤去コードは calendar_dates 前提。本番は必ず ①migration 適用 ②holiday/newyear/special シード実行（newyear は無期限カレンダーの未来年含む）③実DBで等価ゲート/spot-check green 確認 → **その後に撤去コードを live** の順。逆順だと calendar_dates 空で全判定が素の曜日に落ちる。newyear ホライズンは「現在年+1」なので**年次で再シードして延伸**（祝日CSV年次差し替えと同時運用）。
  - 参照: 旧判定 `calendar.query.ts:164-185`（buildDayOfWeekMatcher）/ 3配列 `day-of-week.ts`（holidays/newYearDays/specialCalendarDays）/ T7.1 の新シード
  - DoD: 日付範囲の全対象日で「旧判定（isSpecialCalendarAvailable / isHoliday||isNewYear / 通常曜日）」と「seed 3系統（holiday+newyear+special）から実体化した calendar_dates 判定」が完全一致することを検証する純関数。**2019年（即位礼・国民の休日）・2020-2021年（五輪移動）・年末年始・通常日**を含む代表日で spec green。不一致検出時は日付リストを返す
  - 検証: api jest（対象 spec）Tests 行・型

## P8 ユーザー判断反映（2026-07-20 決定・client 実装 / 未着手）

> 「溜まった新規判断」を 2026-07-20 に全決着。要コード修正は下記4件（すべて client）。各サブエージェントには対象ページ+モックを Read させ「既存流用せずモックから」を明記（[[feedback_subagent_model_and_redesign]]）。視覚検証は管理者 Playwright（dangerouslyDisableSandbox）。**決定のうち「維持」（T5.1/T6.9/T6.4②③⑤・記述誤りT6.12/T6.6）は対応不要**。

- [x] **P8-1 形式付記の「系」を全廃** — コミット `cc3dc61`。`Tests: 603 passed, 603 total`。変更: real-time 2カード（operation-real-time-operation-card / -formation-card）の `formationAnnotation` 内 `` `${vehicleType}系` `` を素通しに。**管理者 Playwright 実測**: real-time カードが「8000・相鉄」「10000・相鉄」等で形式系サフィックス残存0件。逸脱なし（車両解説記事の正式名「8000系」・路線「系統」は別物として維持・データ無加工）。 — 形式（formation の形式表記）に付けている「系」サフィックスを除去（10000系→10000・E233-7000系→E233-7000）。付与箇所を特定して除去。**セレクトの正式名称等データ側は無加工**。対象は表示層のみ。検証: jest + Playwright（real-time/列車位置カードで「系」消失）
- [x] **P8-2 青帯バナーを削除** — コミット `d7222e9`。`Tests: 603 passed, 603 total`。変更: 駅別/全線の各時刻表テーブル部品（timetable-station-table / timetable-all-line-table の {html,ts}）から青帯 `<header>` を削除＋付随の未使用フィールド（isHolidayCalendar/tripDirectionLabel/stationName/tripDirection）撤去。共有バナー部品は無く各ページ独自 header だった。**管理者 Playwright 実測（実データ検索フロー）**: 全線=バナー無し・時刻表241行描画・ダイヤ情報「2009年11月01日改正 平日ダイヤ」は select に残存／駅別=横浜×平日ダイヤ×上りで時刻表フル描画（種別色・列番・運番・編成番号）・バナー無し・ダイヤ値 select に残存＝**情報削減なし**。（当初セル0に見えたのは独自 DOM への eval セレクタ不一致の計測ミス・screenshot で描画確認）。**逸脱**: ①運用表は変更前から既に対応済み（select 常設） ②**運用行路図の同型帯は残置**——このページは改正日/ダイヤ名/運用番号を出す select/トグルが無く（路線チップのみ）帯が唯一の情報源で、削除すると情報削減になるため保守的に保持（[[project_design_principles]]）。要ユーザー判断: 行路図の帯も消すなら情報を別コントロールに出す必要あり。
- [x] **P8-3 行路図の路線チップを関連路線のみ表示に絞る** — コミット `39dda99`。`Tests: 607 passed, 607 total`（新規4）。変更: `operation-route-diagram.store.ts` の `routeOptions$` を関連路線でフィルタ＋純関数 `operation-route-diagram-related-route-ids.util.ts`（新規+spec）＋route-filter spec を新仕様に更新。関連路線＝経由路線(visitedRouteIds)＋分岐/境界駅の隣接路線まで（連鎖拡張なし）。描画パスは `selectedRouteIds`(=visitedRouteIds・不変)参照で保護。**管理者 Playwright 実測（運用表→行路図遷移・operation_id=e562e6a3）**: チップ4個（厚木線/本線/いずみ野線=ON✓・新横浜線=disabled灰）＝関連路線のみ・遠方路線(東急/JR/埼玉高速等)非表示・D-4 維持／行路帯フル描画（6008各停/2701快速/3013特急…種別色・出庫タグ・駅軸健在・svg32要素）＝描画不変。逸脱なし。
- [x] **P8-4 列車入力の路線チップ既定を絞る** — コミット `49848eb`。`Tests: 612 passed, 612 total`（新規5）。変更: `timetable-edit-form.service.ts` の `fetchRoutes()` 既定選択を「全路線→自社(agencyName==='相鉄')路線のみ」に＋純関数 `timetable-edit-form-default-route-ids.util.ts`（新規+spec）＋`AgencyListStateQuery` 注入。options（全路線）は無変更・下書きは selectedRouteIds 非保持で無影響・agency 未解決時は全路線フォールバック。**管理者 Playwright 実測（add モード・calendar_id=494221b2）**: 初期選択=相鉄自社4線（新横浜線/本線/いずみ野線/厚木線）のみ／全18路線（川越線/埼京線/東急/JR/埼玉高速…）は折り畳みパネルに到達可能＝情報削減なし。逸脱なし。
- [x] **P8-6 ヘッダーの更新（リロード）ボタンを削除（2026-07-20 指示）** — コミット `5638d70`。`Tests: 603 passed, 603 total`（layout 8）。変更: `layout/components/header/header.component.{html,ts,spec.ts}`（リロード `mat-icon-button`＋`onClickReload()` 削除・spec はリロード非表示に追随）。**管理者 Playwright 実測**: ヘッダーアイコンは `menu`＋`account_circle` のみ・`refresh` 消失・「ようこそ」維持を確認。逸脱なし。 — T6.5 `4657567` で追加したヘッダーのリロードアイコンを撤去（「ようこそ」表示は維持）。対象: layout ヘッダー component。検証: jest + Playwright（リロードアイコン消失・他ヘッダー要素維持）
- [x] **P8-7 ダッシュボード ヒーロー背景ダイヤの範囲を狭めて判読可能にする（2026-07-20 指示・方針訂正×2）** — コミット `0cacd2e`（既存±30分窓の spec 追加）＋ `7429ccb`（主要駅粗化・本実装）。`Tests: 625 passed, 625 total`（新規計13）。**経緯**: ±30分窓（`WINDOW_MINUTES=30`・現在時刻線 viewW/2 中央赤）は `745492c`(2026-07-16)で既に実装済みだった（管理者の当初「561本=全時間帯」診断は誤りで、実際は±30分窓内をセグメント描画した数）。だが±30分でもラッシュ時は約30本×全駅軸で≈474 line と密で判読しづらい→ユーザー決定「主要駅のみの粗い軸に」。→ `select-major-station-ids.util.ts`（新規+spec）で**主要駅＝各線起終点(stationSequence min/max)＋乗換/分岐駅(複数routeId所属)**をデータ駆動導出し、`build-dashboard-mini-diagram.util.ts` に任意 `majorStationIds` を足してヒーロー背景の y 軸のみ間引き。`estimatePositions`(走行本数)は全駅軸のまま＝数値不変。**管理者 Playwright 実測（390px）**: ヒーロー線数 474→**125**（紺124＋赤1）に激減・上部の塊消失・数値/時計/日付/ダイヤ名クリーン・±30分窓/現在時刻線/tripClassColor/走行本数22 維持。時間帯で密度偏るので更に絞る余地あり（要望あれば主要駅定義を狭める）。逸脱なし。 — 原文:  トップページ（ダッシュボード）上部ヒーロー背景の実データダイヤ SVG（Fable 作）が `viewBox 0 0 200 120` の豆粒領域に**全時間帯・全列車＝561本の線**を詰めて乱雑に交差し判読不能（ユーザー「ぐちゃぐちゃ・何がなんだか分からない」）。**撤去でなく「表示範囲（時間窓）を狭める」**のが方針（ユーザー訂正 2026-07-20「実データに沿ったダイヤにしたが、もっと範囲を狭めるべきだった」）。→ **現在時刻を中央に前後30分（現在−30分〜現在+30分＝計1時間窓）**に絞って描画列車を大幅に減らし（561線→約15〜30線）、線を疎にして読める密度にする（ユーザー決定 2026-07-20「プラス・マイナス30分」）。赤の現在時刻ラインは窓中央のカーソルとして残す。密度は時間帯で偏るので実装後 Playwright で微調整可。実データ・種別色は維持。対象: `pages/dashboard/`（ヒーロー背景ダイヤの range 算出）。検証: jest + Playwright 390px（線が疎で判読可能・現在時刻線が窓内・数値/時計が明瞭）
- [x] **P8-9 チップ内テキストの左右パディング非対称（左寄り）を修正（2026-07-20 指示・列車位置で発覚）** — コミット `c7bf696`（差し戻し1回込み・amend）。`Tests: 603 passed, 603 total`（回帰ゼロ）。変更: `shared/filter-chips/filter-chips.component.scss` に単一選択モードのみ `.filter-chips-single .mdc-evolution-chip__action--primary { padding-left:12px }` を追加（単一選択は graphic が `display:none` で左余白0だった真因を補填）。**差し戻し経緯**: 初版は複数選択にも padding-left:12px を足し、複数選択の未選択チップを 25/13 に過補正して壊した（複数選択は graphic width:0 でも内在パディングで元々 13/13 対称）→ 複数選択ルールを削除。**管理者 Playwright 実測検証（390px）**: 単一選択（train-location）gapL≈gapR≈12〜13（●本線含む）/ 複数選択（real-time）13/13 に復帰＝両モード対称・無破壊。 — 「列車位置情報のチップがおかしい」＝**チップ内テキストが左に寄っている**（管理者実測: `gapL`≈0〜1px / `gapR`≈12〜13px で全チップ systematic・縦は dV=0 でセンター）。真因: Material MDC チップの leading graphic スロット（選択チェックマーク用 `.mdc-evolution-chip__graphic`）が幅0pxに潰れているのに action 要素の `padding-left:0px` が残り、graphic が担うはずの左余白が補われずテキストが左詰めになる。**共有チップ部品（filter-chips / mat-chip-option スタイル）由来と推定＝他ページのチップも同じ左寄りのはず**（列車位置は●＋全社グループ化で目立った）。→ **チップラベルの左右 padding を対称化**（例: action/label の左を右と同じ 12px に、または graphic 潰れ時の左余白補填）。角型 G0-2 は維持。preflight 無効に注意（[[project_tailwind_border_needs_solid]]）。対象: 共有 filter-chips コンポーネントの scss（mat-chip-option 上書き）。**共有部品を触るため全チップ利用ページ（real-time/route-diagram/駅別/全線/過去運用/列車位置/ダイヤグラム）の回帰を管理者 Playwright で確認**。検証: jest + Playwright 390px（gapL≈gapR に対称化・各ページのチップ文字が中央寄り）
- [x] **P8-8 ダッシュボードのカード影とアコーディオン影の被りを解消（2026-07-20 指示）** — コミット `7009cb7`。`Tests: 612 passed, 612 total`（dashboard 18）。変更: `dashboard-collapsible-cards.component.{html,ts,scss(新規)}`。`mat-accordion displayMode="flat"`＋各 `mat-expansion-panel` を `box-shadow:none`（ng-deep）＋`tw-gap-2` 撤去→`tw-divide-y tw-divide-solid tw-divide-grey-300` 区切り線＋アコーディオン全体を単一面 `tw-bg-white tw-shadow-md`（カードと同 shadow トークン）に統一。**管理者 Playwright 実測（390px）**: 6パネルとも box-shadow「none」・単一白面＋細区切り線・隙間の二重影帯解消・上のカードと非衝突・開閉シェブロン/本文健在。逸脱なし。 — 原文:  トップページで**各種カードの影とアコーディオンメニュー（mat-expansion-panel）の影が被る**。実測: アコーディオンは6枚の mat-expansion-panel が各々 MDC 既定 elevation 影（`rgba(0,0,0,.2) 0 3px 1px -2px, rgba(0,0,0,.14) 0 2px 2px 0…`）を持ち 8px 間隔で積層→隣接パネル間の隙間で影が二重化。上の独自カード（mat-card でなく div・影あり）とも隣接して被る。→ **アコーディオンを個別 elevation でなくフラット化**（`box-shadow: none` + 区切り線/1px枠 or 単一グループ影）し影の積層を解消、カードとの elevation 言語を統一（浮かせる面を減らす）。情報削減なし・開閉機能維持。対象: `pages/dashboard/`（アコーディオン=このサイトは？/運用情報検索・投稿/時刻表検索・投稿/ライブラリ 等）+ 必要なら共通 collapsible/expansion スタイル。検証: jest + Playwright 390px（隣接影の二重帯が消え・カードとアコーディオンの影が整理されて見える）
- [x] **P8-5 余白の 4px グリッド化＋スマホ横余白ほぼ0（全ページ横断・2026-07-20 指示）** — コミット `f3d1dfa`（差し戻し1回込み・amend）。`Tests: 603 passed, 603 total`。変更: 10ページの `<main>` ルートで `max-sm:tw-px-2`→`max-sm:tw-px-0`（11ファイル）＋ `shared/ad-placeholder` に `box-sizing:border-box`。train-diagram/train-location は元々 px-2 無し（0px）。**差し戻し経緯**: flush 化でダッシュボードの広告枠（width100%+1px枠）が 392>390 の2px 横スクロールを誘発→ ad-placeholder に box-sizing:border-box で解消。**管理者 Playwright 実測（390px）**: 全ページ rootPad 0px・dashboard/real-time/train-location/train-diagram とも横スクロールなし・クイックタイル等が full-bleed で窮屈感解消。半端値 `tw-p-[6px]`（all-line のアイコンボタン・意図的サイズ計算）はスコープ外で未修正。 — 全ページルートの横 gutter を `max-sm:tw-px-0` に（従来 `max-sm:tw-px-2` を上書き＝P4.6 `6be47d8` の更新）。半端値 padding があれば4px系に是正。カード内部 padding は残す（full-bleed カード＋内部余白＝情報削減なし）。対象: 全ページルート（約10）+ 目立つ半端余白。検証: jest + Playwright 390px（横スクロールなし・カードが画面端まで・窮屈感解消を目視）。[[project_spacing_4px_mobile_flush]]

## P9 行路図の帯文法是正（2026-07-20 ユーザー指摘「モックに寄せて逆に変」・裁定=99 文書）

> T6.12 `4c6e22d` は要素単位（白地枠・タグ有無・フィット値）ではモック検証したが、**帯の描画文法
> （一筆書き階段）を「独立角丸ボックス＋下置き時刻＋オレンジタグ」に誤訳**していた。管理者が
> mockup-04 を ffmpeg 3倍拡大して裁定した一次資料 = `.context/redesign-2026-07/99-route-diagram-band-grammar-2026-07-20.md`
> （**98 §G6 より優先・各サブエージェント必読**）。赤帯・チップ構成・罫線・色言語はスコープ外（99 §スコープ外）。

- [x] **P9-1 帯描画をモック04の一筆書き階段文法へ是正** — コミット `c6f37e1`（差し戻し2回込み・amend×2）。`Tests: 76 passed, 76 total`（単体）/ `Tests: 637 passed, 637 total`（全体・baseline 625→回帰ゼロ）。変更: rect(rx=6)角丸ボックス撤去→横線1本(tripClassColor/回送は#9e9e9e破線)。時刻を線の上側両端(anchor start/end)へ。旅客ラベルは線の下側中央、回送ラベルは線の上側中央（「回」未含有時は前置）。オレンジタグ・△撤去、入庫■(navy fill)+「HHMM入庫」・出庫○+「HHMM出庫」。列車i→i+1の折返しをQ(二次ベジェ)角丸pathで縦線接続。**差し戻し経緯**: ①初版は出庫マーカー付近で回送ラベル/到着時刻/出庫テキストが同一y座標(線の上8px)に同居し1駅区間(列幅22px)で文字重複「回940217」化→出庫テキストのみ10px上へ分離させたが②回送ラベルと到着時刻がなお同じ高さで重複→時刻/ラベル/出庫テキストを線から8/18/28pxの3段（列幅非依存）に再分離して解消。管理者Playwright実測（11運・390px・実データ・フルページ）で出庫3行が階段状に分離・入庫側「■0017入庫」も無事・優等種別（特急/快速）の白地枠+階段状折返しがモック04と一致することを確認。逸脱なし。
  - 対象: `pages/operation/operation-route-diagram/` の drawing-presentational {ts,html,spec}・build-band-view-models util+spec（必要なら interface）
  - 参照: 99 文書（必読）/ `mockups/mockup-04-route-diagram.jpeg` / 既存流用せずモックから（[[feedback_subagent_model_and_redesign]]）
  - DoD: 横線1本化（種別色・回送=灰破線）・時刻=線の上両端・旅客ラベル=線の下/回送=線の上・「回」前置・着端からの縦線接続（角丸r≈6）・出庫○+「HHMM 出庫」/入庫■+「HHMM 入庫」・オレンジタグ/角丸ボックス/下置き時刻/△の撤去・PNG出力追随・赤帯/チップ/二重罫線/グリッドは不変
  - 検証: `npx jest`（`Tests:` 行必須・baseline 625）+ 管理者 Playwright 実測（11運・390px・モック04比較）
- [x] **P9-2 カードの max-sm full-bleed 化（32px はみ出し解消）** — コミット `abcb288`。`Tests: 76 passed, 76 total`（単体）/ `Tests: 637 passed, 637 total`（全体・回帰ゼロ）。変更: drawing-presentational.component.html の `tw-p-4` に `max-sm:tw-px-0` を追加（既存10ページと同一パターン踏襲）。逸脱なし（全体実行中の timetable-station フレーキーテスト1件は単独実行で再現せず無関係と確認済み）。
  - 対象: drawing-presentational.component.html（カード内 `tw-p-4` の横成分のみ）
  - 参照: 99 §フィット寸法（clientWidth=358/scrollWidth=390 実測）/ [[project_spacing_4px_mobile_flush]]
  - DoD: max-sm で図コンテナ実効幅=390（clientWidth==scrollWidth・右端駅列可視）・sm 以上は現状維持・ボタン等テキスト部の内部余白維持
  - 検証: `npx jest` + 管理者 Playwright（390px で client/scrollWidth 実測）

- [x] **P9-4 行路図ラベルの可読性折衷（線は一筆書き維持・ラベルのみ背景ボックスで拡大）** — コミット `8ec3b32`。`Tests: 79 passed, 79 total`（単体）/ `Tests: 640 passed, 640 total`（全体・baseline 637→回帰ゼロ）。変更: ラベル背景に fill-opacity(0.15) の種別色/灰半透明角丸矩形(rx=6)・文字幅概算（全角=フォントサイズ/半角=0.6倍）で可変幅・font-size 10→12拡大。ROW_HEIGHT(50→70)・ROW_TOP_MARGIN(18→24)等を拡大分の衝突回避で微増（時刻・出庫入庫の位置ロジック式自体は不変）。**管理者Playwright実測（11運・390px・実データ・フルページ）**: 「6008 各停 横浜」「2701 快速 湘南台」「3013 特急 海老名」等が種別色背景ボックスで区切られ大きく読める・一筆書き折返し接続は維持・出庫側の重なりも解消。ユーザーへスクショ提示済み。逸脱: モックへのピクセル忠実より視認性を優先する明示的ユーザー判断のため99§追補どおり許容。
  - 対象: drawing-presentational.component.{ts,html,spec.ts}（P9-1 と同一ファイル）
  - 参照: 99 §追補（必読・モック04より優先の確定方針）
  - DoD: 99 §追補の「追加DoD」どおり。線・折返し接続・時刻・出庫入庫マーカーの位置ロジックは変更しない。ラベル（列番+種別+行先／回送=列番のみ）に半透明背景の角丸ボックスを敷き、フォント拡大＋太字で視認性を上げる
  - 検証: `npx jest`（baseline 637・回帰ゼロ必須）+ 管理者 Playwright（11運・390px・可読性目視）
- [x] **P9-5 駅名色/二重罫線/ラベルデザイン統一/PNG出力の情報切れ是正（2026-07-20 ユーザー指摘4点）** — コミット `bb3ab4f`。`Tests: 79 passed, 79 total`（単体）/ `Tests: 640 passed, 640 total`（全体・baseline通り回帰ゼロ）。変更: ①駅名ヘッダー`fill="#001556"`→`#212121` ②`boundaryTpl`・呼び出し3箇所・`boundaryXs()`・`borderAfterStation`import削除（`gridlinesTpl`は無変更）③standard行は種別バッジ(不透明塗りつぶし+白文字rx=3)+行先(黒#212121太字)+列番(グレー#757575)の3パーツ横並びに置換、`OperationRouteDiagramBandRow.label`廃止し`tripNumber`/`tripClassName`/`destinationStationName`個別フィールド化（回送は変更なし）④`downloadAsPng()`のヘッダーテキストを`nameLine1`/`nameLine2`の2行描画に分割・高さ64→96。**管理者Playwright実測（11運・390px・実データ+実PNGダウンロード）**: 画面描画で「各停 横浜 6008」「快速 湘南台 2701」等が塗りつぶしバッジ+黒字行先+グレー列番の3パーツで表示・駅名黒字・二重罫線消失（薄いグリッド点線は健在）を確認。**実際にPNGをダウンロードして中身確認**: ヘッダーが「2022年03月12日改正」「土休日ダイヤ 11運」の2行にCanvas幅内で収まり、旧実装で発生していた右側の文字切れが解消。逸脱なし。
  - 対象: drawing-presentational.component.{ts,html,spec.ts}（P9-1/P9-4 と同一ファイル）
  - 参照: 99 §追補2（必読・4点とも確定事項）/ `timetable-station-trip-cell.component.html` / `train-location-card.component.html`（デザインシステム参照元・既存流用）
  - DoD: ①駅名ヘッダー色を青系から黒系へ ②`boundaryTpl`（二重縦罫線）削除・`gridlinesTpl`（薄いグリッド線）は残す ③ラベルを「種別=tripClassColor塗りつぶしバッジ+白文字／行先=黒文字太字／列番=グレー文字」に統一しP9-4の単色半透明背景表現は廃止（回送は現状の灰表現のまま） ④PNG出力ヘッダーを2行描画に分けCanvas幅内に収める
  - 検証: `npx jest`（baseline 640・回帰ゼロ必須）+ 管理者 Playwright（11運・390px・実データ+PNGダウンロード実行確認）

- [x] **P9-6 折返し接続線の丸め処理撤去・種別バッジのグラデーション化（2026-07-20 ユーザー再指摘）** — コミット `64953b6`。`Tests: 81 passed, 81 total`（単体）/ `Tests: 642 passed, 642 total`（全体・baseline 640→回帰ゼロ）。変更: ①`CONNECTOR_CORNER_RADIUS`/Q二次ベジェ/`stroke-linecap="round"`を撤去し`connectorPathD = M ${cx} ${y1} L ${cx} ${y2}`の単純垂直直線に置換（y1/y2はrow.centerY/next.centerYそのまま） ②標準行のバッジfillを単色から列車ごと一意なid（`route-diagram-badge-gradient-${tripOperationListId}`）の`linearGradient`（tripClassColor→白35%ブレンドの明色）に変更。回送は変更なし。**管理者Playwright実測（11運・390px・実データ+実PNGダウンロード再実施）**: 接続線path座標が`M 82.67 59 L 82.67 129`等の単純直線でDOM実測（帯線y座標59/129と完全一致・6pxオフセット消失）を確認。バッジは「各停」黒系・「快速」青系・「特急」オレンジ系のグラデーションを画面・PNG出力の両方で目視確認。逸脱なし。**教訓**: P9-5検収時に自分でダウンロードしたPNGを見ておきながら丸め接続線のズレを見落としており、ユーザー指摘で気付いた（[[feedback_visual_realdata_gate]]に「ズームして細部を見る」の重要性を追記検討）。
  - 対象: drawing-presentational.component.{ts,html,spec.ts}（P9-1/P9-4/P9-5 と同一ファイル）
  - 参照: 99 §追補3（必読・管理者が座標実測で原因確定済み）
  - DoD: ①`connectorPathD`（`CONNECTOR_CORNER_RADIUS`によるQ二次ベジェ+オフセット丸め）を撤去し`M x y1 L x y2`の単純な垂直直線にする（xは着駅=発駅の同一座標） ②種別バッジのfillを単色から`linearGradient`（tripClassColorベース・列車ごとに一意なgradient id）に変更（回送は変更なし） ③線・時刻・出庫入庫マーカー・行先/列番表示はP9-5のまま変更しない
  - 検証: `npx jest`（baseline 640・回帰ゼロ必須）+ 管理者 Playwright（11運・390px・実データ+実PNGダウンロードで目視確認）

- [x] **P9-7 PNG出力offset未加算バグ修正・グラデーション対象を接続線に訂正（2026-07-20 ユーザー再指摘）** — コミット `3ad0534`（差し戻し1回込み・amend）。`Tests: 84 passed, 84 total`（単体）/ `Tests: 645 passed, 645 total`（全体・baseline 644→回帰ゼロ）。変更: ①`connectorPathD`文字列事前確定を廃止し`connectorX`/`connectorY1`/`connectorY2`(offset無し)をビューモデルに持たせテンプレート側で`+offset`して動的にd属性組み立て ②接続線strokeをrow.colorベースのlinearGradientに、バッジは単色ベタ塗りに戻す。**差し戻し経緯（2段階の致命的バグを管理者が実測発見）**: 初版は「offset加算はDOM実測で確認した」という報告だったが、管理者がPNGを実際にダウンロードしピクセル解析（Blob→Image→Canvas→getImageData）したところ**接続線が完全に消失**していた。原因はSVG仕様の既知の罠——垂直な接続線は境界ボックス幅が0の図形で、`gradientUnits`未指定（既定=objectBoundingBox）だと仕様上ペイントが無効化されstrokeが描画されない（種別バッジは矩形で幅・高さとも非ゼロのため同じ実装パターンで問題が起きず、これまで気づけなかった）。**この不具合は画面表示のネイティブSVGレンダリングでは再現せずPNG出力のBlob→Image→Canvas変換でのみ発生する**ため、画面確認だけでは検出不能。管理者がgradientUnits="userSpaceOnUse"注入で実測復活を確認してから差し戻し、修正後は管理者が同じ手順（DOM実測+実PNGダウンロード+ffmpegピクセル拡大）で接続線の正しい接続位置とグラデーション発色（黒→薄グレー等、上から下へ）の両方を実物で確認した。逸脱なし。**教訓**: gradientをSVGに適用する際は対象図形の境界ボックスが縮退（幅/高さ0）していないか確認必須。PNG/画像出力機能の検証は「画面のPlaywright確認」だけでなく「実際にダウンロードしてBlob→Image→Canvas変換のピクセルを見る」までやらないと、レンダリングパイプライン固有のバグを見逃す（[[feedback_visual_realdata_gate]]に追記）。
  - 対象: drawing-presentational.component.{ts,html,spec.ts}（P9-1/P9-4/P9-5/P9-6 と同一ファイル）
  - 参照: 99 §追補4・§追補5（必読・管理者がコード直読とピクセル実測で原因確定済み・致命的バグ）
  - DoD: ①`connectorPathD`の文字列事前確定をやめ、offset無しの個別値をビューモデルに持たせテンプレート側で`+offset`して動的にd属性を組み立てる（画面表示=offset0とPNG出力=offset96の両方で正しい位置になることをDOM実測で確認） ②接続線(path stroke)を`row.color`ベースのlinearGradientに変更（`gradientUnits="userSpaceOnUse"`必須） ③種別バッジは単色ベタ塗りに戻す（P9-6のbadgeGradient撤去） ④線・時刻・出庫入庫マーカー・行先/列番表示は変更しない
  - 検証: `npx jest`（baseline 642・回帰ゼロ必須）+ 管理者Playwright（**画面表示とPNG出力の両方**で接続線位置をDOM実測・実PNGダウンロード+ピクセル解析で確認必須）

- [x] **P9-8 接続線グラデーションを「前種別色→次種別色」に訂正（2026-07-20 ユーザー最終確定）** — コミット `98a1177`。`Tests: 84 passed, 84 total`（単体）/ `Tests: 645 passed, 645 total`（全体・baseline通り回帰ゼロ）。変更: 接続線gradientの終了色を`lightenHexColor`による同色濃淡から`next.color`（接続先の列車の種別色。新フィールド`connectorEndColor`）に変更、開始色は`row.color`のまま。未使用化した`lightenHexColor`/`CONNECTOR_GRADIENT_LIGHTEN_RATIO`を削除。**管理者Playwright実測（実PNGダウンロード+Blob→Image→Canvas→getImageData）**: 各停→快速の接続線で上端`[34,35,40]`（各停の黒系）・下端`[61,79,175]`（快速の青系）を確認——接続元→接続先の種別色へ正しくグラデーションしていることを数値で確定。逸脱なし。
  - 対象: drawing-presentational.component.{ts,html,spec.ts}（P9-1/P9-4/P9-5/P9-6/P9-7 と同一ファイル）
  - 参照: 99 §追補6（必読・ユーザーが真意を確定）
  - DoD: 接続線gradientの開始色=`row.color`（接続元）・終了色=`next.color`（接続先）に変更。`lightenHexColor`による同色濃淡（`connectorGradientLightColor`）は廃止。`gradientUnits="userSpaceOnUse"`は維持
  - 検証: `npx jest`（baseline 645・回帰ゼロ必須）+ 管理者Playwright（**実際にPNGをダウンロードし接続線の上端/下端ピクセル色が接続元/接続先の種別色になっていることをffmpeg拡大+ピクセル解析で確認**。画面確認のみで終わらせない）

- [x] **P9-9 可読性・表現統一の6点是正（2026-07-21 ユーザー指摘）** — コミット `e814f0f`（差し戻し1回込み・セッションリミット復旧）。`Tests: 85 passed, 85 total`（単体）/ `Tests: 646 passed, 646 total`（全体・baseline 645→+1・回帰ゼロ）。変更: ①BADGE/TRIP_NUMBER 10→12px・LABEL(行先/回送) 12→14px・時刻10→12px・駅名11→13px・出庫入庫9→11px、ROW_HEIGHT等のオフセット定数も比例拡張 ②`fit-columns.util.ts`を「390pxフィット優先」から「COLUMN_WIDTH=30px固定・駅数が多ければ390pxを超えて横スクロール」に変更 ③`verticalCenterOffset()`でBADGE/TRIP_NUMBER_FONT_SIZEとLABEL_FONT_SIZEの差分の半分だけy座標を補正しバッジ・行先・列番の視覚的中心を揃える ④コードレビュー完了（後述） ⑤「回」自動前置を廃止し`nonRevenueLabelText = '回送 <列番>'`をstandard行に近いレイアウトで表示 ⑥入庫を白抜き黒枠の`<polygon>`（masterブランチ座標踏襲）に変更。**④コードレビュー結論（実データ確認はローカルDBに直通データなしのため不可・コードレビューのみ）**: `reconnectTripOperationLists`が非表示駅への始発/終着を最寄りの表示中駅IDへ置換済みで境界駅名フォールバックとして機能し、`curateRouteDiagramStations`が直通全社局の代表駅を含むcurated master listのため、経由路線が不変でONの設計（P8-3）と合わせて`destinationStationName`が空になるケースは実質存在しない、現状維持で問題なしと判断。**管理者Playwright実測（11運・390px・実データ・DOM実測+ffmpeg拡大）**: ①②③⑤⑥を画面で目視確認（「回送 9432」「回送 9473」表現・各停/横浜/6008の縦位置揃い・白抜き三角形の入庫マーカー）、②は正しいoverflowコンテナで`scrollWidth=398/clientWidth=390`と実測し列間隔拡大による横スクロール発生を確認（誤ったセレクタで最初398/390取り違えたが再実測で訂正）。逸脱なし。**セッションリミット復旧の教訓**: 完了通知が"You've hit your session limit"のみの異常応答だった際、git diffで実際の変更内容を確認したところ実装は完了しておりテストのみ未追従（10件失敗、原因は全て仕様変更への追従漏れで実装バグではなかった）。差し戻しでピンポイントに10件の修正指示を出せたため1往復で解決した。
  - 対象: drawing-presentational.component.{ts,html,spec.ts}・fit-columns.util.{ts,spec.ts}・build-band-view-models.util.{ts,spec.ts}（必要な範囲）
  - 参照: 99 §追補7（必読・6点それぞれDoD明記済み）
  - DoD: ①フォント全体拡大 ②390pxフィット優先をやめ列間隔を広げる(横スクロール許容) ③バッジ/行先/列番の縦位置ズレ解消 ④他社線直通の行き先表示を実データで確認（要修正なら対応） ⑤回送ラベルをstandard行と同じレイアウトに統一 ⑥入庫マーカーを白抜き黒枠の三角形(polygon)に変更（masterブランチ準拠）
  - 検証: `npx jest`（baseline 645・回帰ゼロ必須）+ 管理者Playwright（11運+他社線直通運用の両方で390px実データ確認、実PNGダウンロードも確認）

- [ ] **P9-10 列間隔拡大・回送ラベル位置統一・出庫入庫時刻の位置統合（2026-07-21 ユーザー指摘）**
  - 対象: drawing-presentational.component.{ts,html,spec.ts}・fit-columns.util.{ts,spec.ts}
  - 参照: 99 §追補8（必読・3点それぞれDoD明記済み）
  - DoD: ①COLUMN_WIDTH 30→40程度にさらに拡大 ②回送ラベルもstandard行と同じ「線の下」に統一（NON_REVENUE_LABEL_OFFSET分岐撤去） ③出庫/入庫の専用テキストを通常の発着時刻と同じ高さ(線の上・TIME_LABEL_OFFSET)に統合しマーカーと重ならないよう配置。1駅区間での重なり再発がないか実測確認必須
  - 検証: `npx jest`（baseline 646・回帰ゼロ必須）+ 管理者Playwright（11運・390px・実データ+DOM実測でマーカー/テキスト非衝突確認）

- [x] **P9-11 回送のバッジ化・縦位置ズレの根本対応・出庫テキストの画面外はみ出し是正（2026-07-21）** — コミット `6b351fe`（差し戻し1回込み・amend）。`Tests: 92 passed, 92 total`（単体）/ `Tests: 653 passed, 653 total`（全体・baseline 651→回帰ゼロ）。変更: ①`layoutLabelGroup()`でstandard用バッジ算出ロジックを共通化し回送も「[灰#9e9e9e塗りバッジ+白文字「回送」] 列番(グレー)」の2パーツに統一（旧`labelBoxX/Y/Width/Height`半透明背景ボックス撤去） ②全テキストに`dominant-baseline="central"`を付与し同一`labelY`共有方式へ切替（`verticalCenterOffset`等の手動近似計算撤去） ③`resolveDepotTextPlacement()`でSVG端付近の反転判定を追加。**差し戻し経緯**: 初版は③のx方向反転のみで、1駅区間・全体最初の駅の出庫で反転後のテキストが同じ行の到着時刻と衝突（「0711 出庫717」に潰れる）を管理者DOM実測で検出→反転時のみy座標を`timeY`から追加で16px上にずらす条件分岐で解消。**管理者Playwright実測（11運・390px・実データ）**: ①「各停」「横浜」「6008」の描画中心が全て523で完全一致（dominant-baseline方式の効果を数値確認） ②回送バッジ「回送 9432」が灰塗りバッジ+グレー列番で表示 ③「0711 出庫」(top389-401)・「0717」(top404-418)がy方向で完全分離し重なり解消。逸脱なし。
  - 対象: drawing-presentational.component.{ts,html,spec.ts}
  - 参照: 99 §追補9・§追補10・§追補11（必読）
  - DoD: ①回送を「種別バッジ(灰塗り+白文字「回送」)+列番(グレー)」の2パーツ構成に統一(standard行と同じ仕組み) ②`dominant-baseline="central"`方式に切り替えバッジ/行先/列番の縦位置ズレを根本解消（手動近似計算`verticalCenterOffset`は撤去） ③出庫/入庫マーカーがSVG左端/右端付近にある場合、テキストを逃がす方向を反転し画面外にはみ出さないようにする（反転時は他要素との衝突回避でy方向にもずらす）
  - 検証: `npx jest`（baseline 648・回帰ゼロ必須）+ 管理者Playwright（11運・390px・実データでDOM実測=getBoundingClientRect比較・出庫テキストが画面内に収まり他要素と重ならないことを確認）

- [x] **P9-12 出庫入庫テキスト簡略化・三角形中心揃え・ボタン余白（2026-07-21 ユーザー指摘）** — コミット `9dbf8c4`。`Tests: 90 passed, 90 total`（単体）/ `Tests: 651 passed, 651 total`（全体。653→651は削除機能に紐づく重複spec統合による意図的な減・失敗ゼロを管理者が`npx jest`再実行で確認）。変更: ①`resolveDepotTextPlacement`・`depotOutTextX/Y/Anchor`・`depotInTextX/Y/Anchor`・関連定数を全削除し「HHMM 出庫/入庫」テキスト描画を撤去、○/△マーカーのみ残し時刻は常に通常のleftTime/rightTime表示に統合 ②入庫`<polygon>`の頂点/底辺yを`centerY-12/+1`から`centerY-6.5/+6.5`に修正（高さ13px維持・バウンディングボックス中心=centerY） ③画像ダウンロードボタンの`<div>`に`max-sm:tw-px-4`追加。**管理者Playwright実測（11運・390px・実データ）**: ①「0711　0717」「0017　0008」のように文字ラベルなし時刻のみ表示を確認、出庫側の重なり問題（過去複数回差し戻し）が構造的に解消 ②三角形バウンディングボックス中心(top2290.5/bottom2303.5→中心2297)と対応する破線の位置(y=2297)が完全一致を確認 ③ボタン本体が`x=16〜374`（画面0〜390から左右16pxずつ余白）で画面端から離れていることを確認。逸脱なし。
  - 対象: drawing-presentational.component.{ts,html,spec.ts}
  - 参照: 99 §追補12（必読）・[[project_spacing_4px_mobile_flush]]（③のUI原則）
  - DoD: ①出庫/入庫の「HHMM 出庫/入庫」専用テキストを廃止し通常の発着時刻表示に統合（showLeftTime/showRightTimeを常にtrueに・depotOutTextX/Y/Anchor等の位置調整ロジックを削除） ②入庫△のバウンディングボックス中心をcenterYに揃える（頂点centerY-6.5・底辺centerY+6.5程度） ③「画像としてダウンロードする」ボタンのラッパーに`max-sm:tw-px-4`等の横余白を追加（SVG部分は現状のfull-bleedのまま）
  - 検証: `npx jest`（baseline 653・回帰ゼロ必須）+ 管理者Playwright（11運・390px・実データでDOM実測=出庫/入庫マーカーの中心とcenterYの一致・ボタン余白の目視確認）

- [x] **P9-13 路線チップの操作系余白・フィルター説明文・時刻表示余白（2026-07-21 ユーザー指摘 + 積み残しP9-3統合）** — コミット `ad5ae90`。`Tests: 90 passed, 90 total`（単体）/ `Tests: 651 passed, 651 total`（全体・回帰ゼロ）。変更: ①route-filterのルート`<div>`に`max-sm:tw-px-4`追加 ②ラベルを「路線で駅を絞り込み（経由しない路線は選択不可）」に変更（mockup-04目視確認） ③時刻表示xオフセットを`leftX+2/rightX-2`から`leftX+4/rightX-4`に変更。**管理者Playwright実測（11運・390px・実データ）**: ①チップ矩形が`x=16〜374`で左右16px余白を確認 ②ラベル文言が正しく表示されていることを確認 ③帯線leftX=104に対し時刻x=108で差分4pxを確認。逸脱なし。
  - 対象: operation-route-diagram-route-filter.component.{html,spec}・drawing-presentational.component.{html,spec}
  - 参照: 99 §追補13・§付随ギャップ（必読）
  - DoD: ①route-filterに`max-sm:tw-px-4`等の横余白を追加（P9-12のボタンと同じ扱い） ②フィルターラベルをモック04準拠「路線で駅を絞り込み（経由しない路線は選択不可）」に変更 ③発着時刻表示のxオフセットを`leftX+2`/`rightX-2`から`leftX+4`/`rightX-4`に変更
  - 検証: `npx jest`（baseline 651・回帰ゼロ必須）+ 管理者Playwright（11運・390px・実データでチップ余白・時刻位置をDOM実測確認）

- [x] **P9-16 列番dy補正値を0.5に最終確定（2026-07-21 ユーザー3値選定）** — コミット `42d4c66`。`Tests: 91 passed, 91 total`（単体）/ `Tests: 652 passed, 652 total`（全体・回帰ゼロ）。P9-15の`-0.75`もユーザー「dy=0が一番自然」と再訂正→さらに「dy=0も微妙にズレてる、+0.25pxぐらいの雰囲気」と追加指摘され、管理者が`dy=0`/`0.25`/`0.5`の3値を並べて提示（**自分の目では差が判別できないと正直に申告した上で**）、ユーザーが実際に見て`dy=0.5`を選定。DOM実測で`dy="0.5"`が正しく反映されていることを確認。逸脱なし。**教訓（3回連続で外した反省）**: `-1.5`(誤)→`-0.75`(誤・同方向)→ユーザー指摘で`0`付近が正しい方向と判明→`0.5`(正)。自分の目視だけで最適値を決め打ちせず、迷ったら正直に「差が判別できない」と伝えて複数候補をユーザーに選んでもらうのが結果的に一番早かった（[[feedback_visual_realdata_gate]]に記録済み）。
  - 対象: drawing-presentational.component.{html,spec}
  - 検証: `npx jest` + DOM実測でdy="0.5"を確認

- [x] **P9-15 列番dy補正値を-1.5から-0.75に調整（2026-07-21 ユーザー再指摘・過剰補正の是正）** — コミット `601363b`。`Tests: 91 passed, 91 total`（単体）/ `Tests: 652 passed, 652 total`（全体・回帰ゼロ）。P9-14の`dy="-1.5"`にユーザーが「今度は上にズレて見える」と指摘→管理者が`dy=0`/`-0.75`/`-1.5`の3値をPlaywright上で切り替えてスクリーンショットを縦に並べて比較（`ffmpeg vstack`）、`-0.75`が最も自然に揃って見えることを確定。**管理者Playwright実測（11運・390px・実データ、ピクセル拡大）**で最終反映後も同じ見た目を確認。逸脱なし。教訓: 視覚補正値は一発で決め打ちせず、複数候補を並べて比較するのが確実。

- [x] **P9-14 列車番号(数字)の縦位置視覚補正（2026-07-21 ユーザー指摘・原因確定）** — コミット `773cf64`。`Tests: 91 passed, 91 total`（単体）/ `Tests: 652 passed, 652 total`（全体・baseline 651→回帰ゼロ）。変更: standard/回送共通の列番`<text>`要素に`dy="-1.5"`を追加。発着時刻は他要素と基準線を共有していないため対象外と判断。**管理者Playwright実測（11運・390px・実データ、スクリーンショットピクセル拡大で目視）**: 「特急 海老名 3013」「回送 9432」とも視覚的に揃って見えることを確認。逸脱なし。
  - 対象: drawing-presentational.component.{ts,html,spec.ts}
  - 参照: 99 §追補14（必読・管理者が実験でdy=-1.5の有効性を確認済み）
  - DoD: 列番テキスト（standard・回送とも）に`dy="-1.5"`程度の視覚補正を追加。発着/出庫入庫時刻の数字も同じ問題がないか確認し必要なら同様に補正。バッジ内種別名・行先（和文のみ）は変更不要
  - 検証: `npx jest`（baseline 651・回帰ゼロ必須）+ 管理者Playwright（11運・390px・実データ。**DOM実測だけでなく必ずスクリーンショットのピクセル拡大で目視確認**）

## 次セッションへの申し送り（2026-07-20 更新・P8 全9件完了）
- **P8（ユーザー判断反映＋視覚フィードバック）全9件 完了・各件管理者 Playwright 実測済み**: P8-1 形式「系」全廃(`cc3dc61`)/ P8-2 青帯バナー削除(`d7222e9`・行路図の赤帯は情報源のため残置＝要ユーザー判断)/ P8-3 行路図チップ関連路線のみ(`39dda99`)/ P8-4 入力チップ既定=自社線(`49848eb`)/ P8-5 余白4px・スマホ横flush(`f3d1dfa`)/ P8-6 ヘッダー更新ボタン削除(`5638d70`)/ P8-7 ヒーロー主要駅粗化(`7429ccb`・474→125線)/ P8-8 アコーディオン影フラット化(`7009cb7`)/ P8-9 チップ左寄り修正(`c7bf696`)。jest ベースライン `Tests: 625 passed`。
- **未決の軽微1件**: P8-2 で運用行路図の帯（赤・改正日/ダイヤ/運用番号）を残置——消すなら情報を別コントロールに出す要あり（ユーザー判断待ち）。
- 溜まった新規判断は全決着（台帳末尾参照・T5.1/T6.9 現状維持・T6.7 系全廃・T6.4 の①④⑥実施②③⑤維持）。
- 実DB移行（P7）はローカル予行演習成功済み。本番は migration→3シード→等価ゲート→撤去 live の順（P7 節参照）。

## 次セッションへの申し送り（2026-07-17 更新・T6.17 完了＝P6 全消化）
- **P6 完了。T6.17 まで全タスク `[x]`。redesign-2026-07 のコード面は全消化した**（P0〜P6）。コミット `b4e0434`（T6.17・amend 済み）が最新。jest 全体ベースライン `Tests: 603 passed, 603 total`（管理者 Playwright で6ページ空状態＋差し戻し2修正を 390px 実測検証済み）。
- **残タスクはユーザー側/運用作業のみ**: ①実DB作業（P2 の calendar_dates マイグレーション適用・祝日シード実行・specialCalendarDays 撤去。内閣府 CSV 調達含む）②T3.1〜T3.6 の最終サインオフ ③「溜まった新規判断」（下記）のユーザー判断 ④**全コミットの署名やり直し**（サンドボックス下 `commit.gpgsign=false` で積んだ全コミットを、ユーザー承認の下で署名ありに amend/rebase。運用メモ参照）。
- コード追加が再発する場合の定石（前回 2026-07-16）: 各サブエージェントに 98 の該当 G 節+対応モックを Read させ「既存コンポーネントの見た目を流用せずモックから作る」を毎回明記（[[feedback_subagent_model_and_redesign]]）。検収は管理者 Playwright 実測が唯一の防衛線（[[feedback_visual_realdata_gate]]）——T6.17 でも初版の死にコード空状態＋補足文欠落を実測が捕捉し差し戻した。
- **サブエージェントへ渡す正確な絶対パス（検索禁止）**: 仕様=`/home/seapolis/Projects/sotetsu-lab-v3/.context/redesign-2026-07/98-pixel-fidelity-gaps-2026-07-14.md`（§G12）/ モック=`.../mockups/mockup-07-empty-state.jpeg`（**モックはサフィックス付きファイル名。`mockup-NN.jpeg` 単体では存在しない**）。`.context` はドット始まりの隠しディレクトリで rg/find 既定はスキップ＝「ファイルが無い」は偽陰性。Read で直接開かせよ（T6.15 で1体が偽陰性停止した）。
- **preflight 無効の落とし穴を毎回伝える**: `tw-border-N` だけでは border-style が none で枠が描画されない→`tw-border-solid` 併記必須（T6.15 で白抜きノード不可視の差し戻し発生。[[project_tailwind_border_needs_solid]]）。empty-state は枠付き要素があり得るので特に注意。
- **今セッション（T6.14〜T6.16）の検収教訓**: 3タスクとも管理者 Playwright が欠陥/主張を実測検証。T6.14=NG1010 は ng-serve 増分キャッシュ残骸（touch で消滅・ソース正常）/ T6.15=preflight 無効で白抜きノード不可視を computed style で捕捉し差し戻し→`tw-border-solid` で解消 / T6.16=「既存準拠」主張（斜線背景・赤線・目撃フラット）は実測で今回は真と確認。**検収側の実測が唯一の防衛線という原則は不変**（[[feedback_visual_realdata_gate]]）。
- **今セッションの検収教訓（T6.11〜T6.13 で3タスク連続差し戻し1回ずつ）**: jest 緑でも実画面が壊れる欠陥を3件とも管理者の Playwright 実測が捕捉した。①T6.11=`ng serve` 増分キャッシュ残骸の NG1010（コミット済ソースは正常・リロードで消滅）②T6.12=優等帯の塗り/枠がモック実物と食い違い（ffmpeg 拡大で裁定）③T6.13=共通 app-button の二重 ng-content でラベル空＋初期値ブロックの NG0201/表示条件ミス。**共通部品（app-button 等）を触るタスクは全ページ回帰を必ず実測**。サブエージェントの「実装済み」主張は今回も不正確（T6.13 コピーブロックは DOM 不在だった）→ 検収側の実測が唯一の防衛線という原則は不変（[[feedback_visual_realdata_gate]]）。
- **検証環境メモ**: dev server は localhost:4200 稼働（api:3000）。edit-form の実データ検証は matrix param 必須＝`/timetable/add;calendar_id=<id>;trip_direction=0`。有効 calendar_id は network の `operations/calendar/<uuid>` から取得（今回使用 `de94e6b3-6d6c-445e-9c35-c8f39bacf3fb`）。update モードは trip_block_id が要るため未視覚検証（次セッションで all-line の編集導線から取ると確実）。
- **検収の教訓（T6.8〜T6.10 で3タスク連続）**: サブエージェントの「既に準拠済み」「実装済み」主張は必ず実画面で裏取りする（3件中3件で虚偽or不正確だった: T6.8 脚注行・T6.9 短縮名・T6.10 免責文）。プロンプトに「準拠済み主張には根拠 ファイル:行 を添えよ」を入れても防げなかったため、検収側の実測が唯一の防衛線。
- **検証時の注意**: 駅別時刻表の脚注行・trip-blocks 依存表示は 6MB バルクロード完了後に遅延描画される（初回計測は 10 秒以上待つこと）。免責文言は「ダイヤ通りに走った場合の位置です」（推定/参考等の語を含まない）。全線時刻表の件数 select は mat-select の2個目。
- **検証分担が確立**: サブエージェント=実装+jest のみ（sandbox は localhost 遮断のためブラウザ確認をさせない）。**Playwright 視覚検証は管理者（メイン）が dangerouslyDisableSandbox で実施**（settings の allowedHosts 追加は seccomp 下で無効と実証済み）。差し戻しは同一エージェントへ SendMessage→amend。
- サブエージェントがふりかえり問いかけで停止することがある→プロンプトに「サブエージェントなのでふりかえり不問」を仕込むか、SendMessage で「いいえ」を返す。
- 実行前に上記「新規判断」をユーザーに確認できれば理想（保守的既定でも続行可）。
- 従来残タスクは継続: ①ユーザー側の実DB作業（P2 の calendar_dates 適用/シード/specialCalendarDays 撤去）②T3.1〜T3.6 の最終サインオフ ③「溜まった新規判断」のユーザー判断 ④署名やり直し。
- **環境メモ**: この sandbox は localhost を許可できない（seccomp）。live 検証は `dangerouslyDisableSandbox`（ユーザー明示許可が要る）でのみ可能。jest は `npm test` 不可→`npx jest`（[[project_client_jest_sandbox]]）。
- **finishing 未実施**: 全コミットの署名なし→署名ありやり直し（運用メモ参照）はユーザー承認待ち。

## 想定コミット数
P0=1 / P1=6〜8 / P2=3 / P3=8 / P4=2〜3 / P5=1〜2（合計 21〜25）

## コミット署名（運用メモ）
- サンドボックス下で GPG 署名の pinentry が非対話ブロックするため、全コミットは `git -c commit.gpgsign=false commit` で**署名なし**で積む（ローカル config は書き換えない）
- **作業完了後**（P5 or finishing 時）にユーザー承認の下、全コミットを同内容で署名ありにやり直す（ユーザー指示 2026-07-03）

## 溜まった新規判断（ユーザーへまとめて質問する用）
- **[実DB移行 発・2026-07-17] calendar_dates 撤去（D-13）前に「旧ハードコードとの完全一致検証ゲート」が必須。現状シードには漏れ2種あり**:
  - **前提**: api `src/core/utils/day-of-week.ts` のハードコードは3配列——`holidays`（祝日・2014〜手書き）/ `newYearDays`=`['12-30','12-31','01-01','01-02','01-03']`（毎年の年末年始）/ `specialCalendarDays`（JR渋谷駅工事臨時のみ・2021-10/2023-01/2023-11）。v3 判定 `calendar.query.ts:169-181` は3つ全部を使い `isSpecialCalendarAvailable`→特別カレンダー / `isHoliday()||isNewYear()`→日曜カレンダー（土休日ダイヤ）で判定。シード `build-holiday-calendar-date-rows.ts` は「祝日×有効カレンダー」を事前実体化し旧経路と等価化する設計（`--from/--to` 未指定＝CSV全件対象・カレンダー有効期間で交差）。
  - **漏れ①（年末年始）**: `newYearDays` を移行するシードが無い。12/30・12/31・1/2・1/3 は祝日でないため内閣府CSVにも入らず（1/1 元日のみCSVで拾える）、撤去で年末年始が平日ダイヤに落ちる。→ **要判断 (A 推奨) 年末年始シードを新設し 12/30〜1/3 を対象年ぶん展開し日曜カレンダーに type1 upsert（GTFS 忠実・D-12）/ (B) isNewYear/newYearDays はハードコード残置**。
  - **漏れ②（過去年カバレッジ・ユーザー指摘 2026-07-17）**: 過去日の運行日判定（過去の運用情報/過去時刻表）を保つには過去年の祝日も calendar_dates に載せる必要がある。①内閣府CSVは1955〜で範囲的に包含するが配置後に最古日付を要確認 ②祝日シードは `--from` を付けず全件流す（過去を切り落とさない）③過去祝日は「その日有効な歴代ダイヤ改正カレンダー」に紐づくため、実DBに歴代カレンダーが有効期間付きで残存していることの確認が要る（旧ハードコード経路も同じ制約＝撤去自体でリグレッションはしないが実DBデータ依存）。**2019年（即位礼・国民の休日）・2020-2021年（五輪で海の日/スポーツの日/山の日が移動）は手書きhardcodeとCSVが食い違い得る要注意年——CSVが法令準拠で正、差分は目視裁定**。
  - **必須ゲート**: 撤去（`isNewYear`/`isHoliday`/`isSpecialCalendarAvailable` を v3 CalendarQuery から削除）の**直前に、過去〜未来の全対象日で calendar_dates 判定＝旧3ハードコード判定の完全一致を検証**してから削る。照合スクリプト（dry-run 生成集合と旧配列の diff）は sandbox 内で jest 可＝実DB実行より先に仕込める。**この検証が green になるまで撤去タスクを切らない**。
- **[T6.12 発・2026-07-16] 98 §G6「優等=紺塗り白字」は記述誤りと確定**: モック04を ffmpeg で3倍拡大し実ピクセル確認したところ、急行/特急の行路帯も他種別と同じ「白地＋種別色（tripClassColor）の枠＋色文字」で、**紺塗り白字（fill）の帯は存在しなかった**。P6基準「モックへのピクセル忠実」＋確定判断「線色 tripClassColor 維持」に従い、優等=塗り分岐を撤去し全旅客帯を白地枠に統一（回送のみ点線灰）。もし優等を塗りで強調したい意図が別途あれば要判断（既定=モック実物どおり全帯白地枠）。98 §G6 の当該記述は訂正せず本台帳を正とする（.context は監査時点スナップショット扱い・T6.6 と同方針）。
- **[T6.9 発・2026-07-15] 種別短縮名マッピングの適用範囲** — ✅**【決定 2026-07-20: 現状維持＝各停のみ】**（モック05 準拠・拡張は根拠なくスコープ外）。対応不要。 / 全線時刻表の種別行に `trip-class-short-name` を新設し保守的既定で「各駅停車→各停」のみ実装（G5/モック05 準拠）。「通勤特急→通特」「通勤急行→通急」等への拡張は 20-design/98 に規定が無いため未実施。
- **[T6.7 発・2026-07-14] 形式付記の「系」表記** — ⚠**【決定 2026-07-20: 「系」全廃＝形式に「系」を付けない】要コード修正（P8-1）**。旧コード方針（系/形表記を避ける）へ戻す。mockup-02 の「10000系」表記は満たさなくなるが承知の上。 / mockup-02 の「10000系・相鉄」に合わせ形式に「系」を付与していた（E233-7000 等が「E233-7000系」になる違和感が全廃の理由）。
- **[T6.6 発・2026-07-14] 98 §G4 の「編成番号/車両番号トグル復元」は記述誤りと確定**: git 全履歴に radio は存在せず（単一入力+サーバー側 OR 解決 `formationOrVehicleNumber`）。トグルはラベル切替 UI として新設済み・機能不変。98 の当該記述は訂正せず本台帳を正とする（.context は監査時点のスナップショット扱い）。
- **[T6.4 発・2026-07-14] P6 忠実度是正の新規判断6件** — ✅**【決定 2026-07-20】**: **①青帯バナー=削除（P8-2）** / ②駅別オレンジ時間帯マーカー=**維持** / ③全線初期ソート=**維持** / **④行路図チップ=関連路線のみに絞る（P8-3）** / ⑤ダイヤグラム線沿いラベル=**不採用維持（タップパネル）** / **⑥列車入力チップ既定=絞る（前回選択 or 自社線・P8-4）**。要コード修正は①④⑥の3件。 / （原文）①各ページの青帯バナー（モックに無い）②駅別現在時間帯オレンジマーカー（モックに無い）③全線初期ソート（直通系偏りで初期視界が「‥」だらけ）④行路図チップを関連路線のみに絞るか⑤ダイヤグラム線沿い回転ラベル⑥列車入力の路線チップ既定。
- **[T5.1 発・2026-07-13] trip-blocks ペイロード 11.64 MiB（非圧縮）の是非 → D-7 再相談トリガ** — ✅**【決定 2026-07-20: 現状維持】**（CloudFront gzip で転送量減・shareReplay キャッシュ有・実利用で体感問題が出てから軽量化に着手）。対応不要。 / 実測で上下合計 11.64 MiB・非圧縮が判明。軽量 DTO/間引き/ページングは今回見送り。関連: [[project_client_jest_sandbox]]。
- **[P2 発] 内閣府祝日 CSV の調達方法**: sandbox が内閣府サイトへ接続不可のため `db/seeds/data/syukujitsu.csv` を私（Opus）が取得できない。ユーザーに `! curl` で取得してもらうか、私が dangerouslyDisableSandbox で1回だけ取得するか要確認（シードのロジック・パーサはフィクスチャでテスト済み、残るは実CSV配置のみ）。
- **[P2 発] 実DB検証**: マイグレーション適用・シード実行・specialCalendarDays 撤去は実DB環境が必要。デプロイ時にユーザー環境で実施する段取りを後で確認。

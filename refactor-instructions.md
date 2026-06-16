# refactor-instructions.md — sotetsu-lab-v3-client

> 作成日: 2026-06-11 / 調査者: Claude (Fable 5)
> 対象リポジトリ: `sotetsu-lab-v3-client`（このファイルが置かれているリポジトリ）
>
> この指示書は、実装担当モデルが**設計判断をせずに**完遂できるよう、移行表・レシピまで具体化してある。表やレシピにない判断が必要になったら、自分で決めずに Stop And Ask Conditions に従って停止すること。

## Objective

既存の画面挙動・API 通信・認証フローを一切変えずに、以下を達成する。

1. **壊れているテストスイートの修復**（100 スイート中 94 が失敗中 — 安全網が存在しない状態の解消が最優先）
2. CI にテスト・lint を組み込み、リグレッションを検知できる状態にする
3. 新旧 2 パターンが混在する状態管理・コンポーネント構成について、機械的に安全な範囲のみ整理する
4. **v2→v3 API 移行を完遂する**（ユーザー承認済みスコープ。ただし API 側の v3 エンドポイント新設 — sotetsu-lab-v3-api の指示書 Phase 4 — が先行する。未提供のエンドポイントが残る間は提供済み分のみ移行する）
5. それ以外の大きな設計変更（SSR コード削除はしない・状態管理パターン全面統一、日時ライブラリ統一）は**提案に留める**

## Project Understanding

- **何か**: 相鉄線の運行・編成・時刻表情報サイト（sotetsu-lab.com）の Angular 20 SPA。S3 + CloudFront にホスティング。バージョンタグ push で CI（`.github/workflows/deploy-on-push-version-tags.yml`、Node 22、`npm run build:prod` → S3 sync + CloudFront invalidation）からデプロイ。
- **エントリーポイント**: `src/main.ts`（Elf devtools・localforage・dayjs・GA 初期化、`bootstrapApplication`）→ `src/app/app.config.ts` → `src/app/app.route.ts`。
- **レイヤー**（詳細はリポジトリの `CLAUDE.md` を必ず読むこと）:
  - `src/app/libs/` — 12 ドメインのデータ層。外部からは `usecase/` のみ参照可。`infrastructure/` の queries が HttpClient + `RequestQueryBuilder`（`@nestjsx/crud-request`）でクエリ構築、`md5(JSON.stringify(params))` キーの `shareReplay` キャッシュを持つ。
  - `src/app/global-states/` — Elf のグローバルストア 11 ファイル。`initialDataResolver` がルート遷移時にフェッチ。
  - `src/app/pages/` — 機能ページ（遅延ロード）。**新パターン**（`stores/*.store.ts`、const オブジェクト + `createStore` 直接使用）と**旧パターン**（`states/*.state.ts`、`createElfStore` ラッパー + `@Injectable`、`-c`/`-p` コンポーネント分割）が混在。
  - `src/app/core/` — `AuthInterceptor`（`x-sotetsu-lab-authorization` ヘッダー付与）、`maintenanceGuard`、`initialDataResolver`、`SocketService`（WebSocket、token をクエリパラメータで渡す）。
- **API**: `environment.apiUrl` の別サービス（sotetsu-lab-v3-api）。`/v2/` と `/v3/` が混在し、v3 移行が進行中（`.context/session-handoff-2026-06-03.md` 参照）。
- **規模**: `src/app` 約 16,000 行、コンポーネント 162（すべて OnPush）。

## Behaviors To Preserve（絶対に壊してはいけない挙動）

1. **認証フロー**: `global-states/token.state.ts` のトークン保持・期限判定（`isExpired`）、`app.component` の 10 秒周期の自動更新、`AuthInterceptor` のヘッダー付与。
2. **`initialDataResolver` のフェッチ順序**（token+user → agency/calendar/routeStation/service 並列 → todaysCalendarList → todaysOperation/todaysFormation 並列）。順序変更でページがデータ undefined になる事例が既知（`.context/session-handoff-2026-06-03.md`）。
3. **WebSocket 連携**: `core/services/socket.service.ts` の接続・再接続のタイミングと token クエリパラメータ。
4. **v2 エンドポイント呼び出し**: `src/app/libs/` の 12 ファイルが `/v2/` を参照中。クエリ文字列の構築方法（`RequestQueryBuilder`）を含め、API リクエストの形を変えない。
5. **インフラクエリのキャッシュ動作**（`shareReplay` + `forceReload`）。
6. **データ送信系**（各ドメイン `infrastructure/commands/`）の payload 形式と builder による model→DTO 変換。
7. **Tailwind の `tw-` プレフィックス**と Material のベーススタイル分担。
8. **localforage（IndexedDB）への永続化**を使っているストアのキー・形式（保存済みユーザーデータとの互換性）。
9. **SSR 関連ファイル**（`server.ts`、`src/main.server.ts`、`tsconfig.server.json`、angular.json の server 設定）。現在 `ssr: false` だが**将来有効化する計画がある（ユーザー回答済み）。削除禁止**。

## Non-Negotiables（作業上の絶対ルール）

- 最初に `git status` を確認する。未コミット変更があれば作業を始めずに報告する。
- master から作業ブランチを切る。`git push` / `git merge` は指示がない限り行わない。
- 編集前に Baseline Commands を実行し結果を記録する。
- 変更は小さく戻しやすい単位でコミットする。
- 無関係な整形・ついでのリファクタリングをしない。
- 既存挙動を勝手に変えない。
- 正しさが不明な場合は実装を止めて質問する。
- 各フェーズごとに検証する。
- 最後に実行したコマンドと結果を報告する。
- リポジトリの `CLAUDE.md` の規約（新規コードのストアパターン、`-c`/`-p` 分割をしない、`inject()` + `#` private 等）に従う。

## Stop And Ask Conditions（即時停止して質問する条件）

- `initialDataResolver` のフェッチ対象・順序の変更（パフォーマンス改善に見えても挙動依存が既知）
- v2→v3 移行中に、v3 エンドポイントのレスポンス形式が v2 と異なり、モデル・ビルダー・利用側コンポーネントの変更が DTO の形を変えるところまで波及する場合
- 移行対象の v2 呼び出しに対応する v3 エンドポイントが API 側に存在しない・機能が不足している場合（API リポジトリへの変更は禁止。不足内容を列挙して停止）
- 日時ライブラリ（dayjs / date-fns / date-fns-tz が併存）・ユーティリティ（lodash-es / es-toolkit が併存）の統一
- localforage に永続化されるストアの構造変更
- 修復不能なテスト（コンポーネントの実態と大きく乖離し、書き直しが必要なもの）を削除したくなった場合 — 削除候補の一覧を提示して確認を取る
- `@nestjsx/crud-request` の置き換え

## Baseline Commands（2026-06-11 時点の実測値）

```bash
npm install        # 実測: 手元の node_modules が古いとビルドが偽の失敗をするため必ず最初に実行
npm run build:prod # 実測: 成功（exit 0。reflect-metadata の CommonJS 警告は既知）
npx jest           # 実測: Test Suites: 94 failed, 6 passed, 100 total / Tests: 24 failed, 6 passed, 30 total
                   # 主因: スタンドアロンコンポーネントを TestBed の declarations に入れている旧式 spec（44 件以上）
npm run lint
```

- E2E: `cypress/e2e/spec.cy.ts` は 7 行のスケルトンのみ。実質存在しない。
- 開発サーバー: `npm run dev`（プロキシは `src/proxy.conf.json`、Docker 外なら調整が必要。CLAUDE.md 参照）。

## Debt Map（根拠付き）

| # | 負債 | 根拠 | 影響範囲 | リスク | 対応 |
|---|------|------|----------|--------|------|
| 1 | テストスイートの 94% が失敗。主因はスタンドアロン化時に spec を追従させなかったこと（`declarations` → `imports` 移行漏れが 44 件以上） | `npx jest` 実測。例: `src/app/pages/timetable/timetable-all-line/components/timetable-all-line-header-p/timetable-all-line-header-p.component.spec.ts:10` | 全リファクタの安全性 | 低（機械的修正） | **実装してよい**（最優先） |
| 2 | テストが形骸化: 通る 6 スイートもほぼ `should create` のみ。ビジネスロジックのテストが無い | 各 `*.spec.ts` の内容 | 安全網の質 | - | **実装してよい**（Phase 2。特に純粋関数の `timetable-all-line.util.ts` 646 行が最優先のテスト対象） |
| 3 | CI に lint / test が無くビルド＆デプロイのみ | `.github/workflows/deploy-on-push-version-tags.yml` | 品質保証 | 低 | **実装してよい**（Phase 1 完了後に test ジョブ追加。デプロイジョブは触らない） |
| 4 | 状態管理 2 パターン混在: 旧 `createElfStore`+`@Injectable`（operation-past-time, operation-table, operation-route-diagram, timetable-all-line, timetable-station 等）と新 const オブジェクト（operation-real-time） | `src/app/core/utils/elf-store.ts`、各ページの `states/` vs `stores/` | ページ全体 | 中〜高 | **提案のみ**(移行はページ単位の挙動検証が必要。テスト整備後に別タスク化) |
| 5 | `RxState`（46 箇所）と Elf の役割重複 | `@rx-angular/state` の使用箇所 | コンポーネント状態 | 中 | **提案のみ** |
| 6 | NgModule 残存 7 ファイル（shared 5 つ + `core.module.ts` + `pipes.module.ts`） | `src/app/shared/*/**.module.ts`, `src/app/core/core.module.ts` | shared 利用ページ | 中 | **条件付き実装**: Phase 1 のテスト修復が終わり、対象コンポーネントの spec が緑である場合のみ、1 モジュールずつスタンドアロン化してよい。`core.module.ts`（プロバイダー登録）は触らない |
| 7 | timetable-add / timetable-update / timetable-copy がほぼ同一コードの三つ子 | `src/app/pages/timetable/timetable-{add,update,copy}/` 各 component | timetable 編集系 | 中 | **提案のみ**（統合は挙動検証が必要） |
| 8 | `timetable-all-line.util.ts` 646 行の巨大ユーティリティ | `src/app/pages/timetable/timetable-all-line/utils/` | 全線時刻表ページ | 中 | **条件付き実装**: 先に characterization test を書き、緑のまま関数分割のみ。ロジック変更禁止 |
| 9 | SSR インフラが `ssr: false` のまま残存 | `server.ts`, `src/main.server.ts`, angular.json | なし | - | **対応不要**（ユーザー回答済み: 将来有効化予定のため保持。削除禁止） |
| 10 | 日時ライブラリ 3 種（dayjs + date-fns + date-fns-tz）、ユーティリティ 2 種（lodash-es + es-toolkit）併存 | `package.json` | バンドルサイズ | 中 | **提案のみ** |
| 11 | v2/v3 API 移行が中途（12 ファイルが v2 参照、`_V3` サフィックスのメソッドが併存） | `grep -r "/v2/" src/app/libs`、CLAUDE.md 末尾 | データ層全域 | 高 | **段階的実装**（Phase 5。API 側の v3 新設が先行条件。提供済みエンドポイントから順に移行） |
| 12 | グローバルエラーハンドラーがログのみでユーザー通知なし | `src/app/core/services/error-handler.service.ts` | UX | 中 | **提案のみ**（挙動追加になるため） |

## Implementation Phases

### Phase 0: 現状確認
1. `git status` 確認。未コミット変更があれば停止して報告。
2. 作業ブランチ作成。
3. `npm install` → Baseline Commands 実行・記録。Jest の失敗数が「94 failed / 6 passed」と大きく異なる場合は停止して報告。

### Phase 1: テストスイートの修復（Debt #1）— 最優先
- 失敗 94 スイートを分類する: (a) `declarations` → `imports` の機械的修正で直るもの、(b) モック・プロバイダー不足、(c) コンポーネントの実態と乖離し書き直しが必要なもの。
- **(a) の修正レシピ**: 対象コンポーネントの `@Component` デコレーターを見る。`imports: [...]` を持つスタンドアロンコンポーネントなら、spec の `TestBed.configureTestingModule({ declarations: [X] })` を `{ imports: [X] }` に変える。これだけで直る spec が 44 件以上ある（エラー文 `"X is marked as standalone and can't be declared in any NgModule"` が目印）。
- **(b) の修正レシピ**: `NullInjectorError: No provider for Y` は `providers` にモック（`{ provide: Y, useValue: ... }`）を足す。HttpClient 系は `provideHttpClient(), provideHttpClientTesting()` を使う。モックの返り値は「コンポーネントが create できる最小限」でよい（挙動テストの追加は Phase 2）。
- (a)(b) を修正する。**テストを通すためにプロダクションコードを変更してはならない**。プロダクション側のバグを発見した場合は修正せず報告する。
- (c) は削除せず一覧化して質問する（Stop And Ask）。判断基準: 30 分相当の試行で (a)(b) のレシピが効かないものは深追いせず (c) に分類して先へ進む。
- 検証: `npx jest` で失敗数の推移を記録。目標は (c) 以外の全緑。

### Phase 2: 安全網の拡充（Debt #2, #8 前段）
- `timetable-all-line.util.ts` の主要関数に characterization test を追加(現状の入出力を固定する。あるべき仕様を発明しない)。
- `global-states/token.state.ts` の期限判定・`AuthInterceptor` のヘッダー付与にユニットテストを追加。
- 検証: `npx jest` 全緑（Phase 1 の (c) 残課題を除く）。

### Phase 3: CI 整備（Debt #3）
- PR/push 時に `npm ci && npx jest && npm run lint` を回すワークフローを追加。既存のデプロイワークフローは変更しない。
- 検証: ワークフロー YAML の構文確認(`act` 等は不要。YAML として妥当であること、既存ワークフローとトリガーが衝突しないことを確認)。

### Phase 4: 機械的に安全な整理（Debt #6, #8）
- spec が緑の shared モジュールを 1 つずつスタンドアロン化（1 モジュール = 1 コミット。`core.module.ts` は対象外）。
- `timetable-all-line.util.ts` をテスト緑のまま関数単位で分割。
- 各ステップで `npm run build:prod` + `npx jest` を確認。

### Phase 5: v2→v3 API 移行（Debt #11・ユーザー承認済みスコープ）

**前提**: Phase 1（テスト修復）完了。**API 側の新 v3 エンドポイント（sotetsu-lab-v3-api の refactor-instructions.md Phase 4 仕様表 #1〜#16）がデプロイ済みであること**。未提供分はスキップして残作業として報告する。

**移行台帳は作成済み**(2026-06-11、全 v2 呼び出し元を実地調査済み)。以下の表に従って移行すること。**表にない判断が必要になったら、自分で設計せず停止して質問する。**

#### 5-A. 共通の移行レシピ

各クエリファイルで、既存の v3 メソッド（例: `formation.query.ts` の `findManyBySpecificPeriod_V3`）と**同じ書き方**で v3 メソッドを追加し、呼び出し元を切り替える: `params` オブジェクト引数 / `RequestQueryBuilder` 不使用 / `md5(JSON.stringify(...))` キーの `shareReplay` キャッシュ + `forceReload` / builder で Model → DTO 変換。`usecase/` のファサードにも対応メソッドを足し、ページ側は usecase 経由で呼ぶ。出力 DTO の形は変えない。

#### 5-B. 移行表（呼び出し元単位）

| # | 呼び出し元 | 現在の v2 呼び出し | 移行先 | client 側で追加する処理 |
|---|---|---|---|---|
| 1 | `global-states/agency-list.state.ts` | `AgencyQuery.findMany`（空 qb） | **新** `GET /v3/agencies` | なし |
| 2 | `global-states/calendar-list.state.ts` | `CalendarQuery.findMany`（join service + serviceName filter + sort） | **新** `GET /v3/calendars?serviceName=`（ソートはサーバー側） | なし |
| 3 | `global-states/todays-calendar-list.state.ts` | `CalendarQuery.findManyBySpecificDate`（配列の先頭しか使っていない） | **既存** `CalendarQuery.findOneBySpecificDate`（単一オブジェクト返し） | ストアへは 1 件を `setEntities([data])` 相当で格納。**注意**: v2 は serviceName filter 付き、v3 は特殊カレンダー判定ロジック内蔵。開発サーバーで同じ日付の結果が一致することを必ず確認し、不一致なら停止して質問 |
| 4 | `pages/.../operation-past-time.service.ts` `fetchCalendarByDate` | 同上（`calendars[0]` を採用） | 同上（日付ごとに `findOneBySpecificDate`） | #3 と同じ注意 |
| 5 | `pages/.../operation-past-time.service.ts` `fetchFormationsV2` | `FormationQuery.findManyBySpecificPeriod`（空 qb） | **既存** `findManyBySpecificPeriod_V3` | 移行後、メソッド名の V2 サフィックス整理は CLAUDE.md 規約に従う |
| 6 | `global-states/todays-formation-list.state.ts` | `FormationQuery.findManyBySpeficicDate`（空 qb、日付指定） | **新** `GET /v3/formations/as/of/:date` | なし |
| 7 | `global-states/route-station-list.state.ts` | `RouteQuery.findMany`（join + serviceName filter + sort） | **新** `GET /v3/routes?serviceName=` | なし（既存の client 側再ソート処理はそのまま残す） |
| 8 | `global-states/service-list.state.ts` | `ServiceQuery.findMany`（serviceName filter） | **新** `GET /v3/services?serviceName=` | なし |
| 9 | `operation-route-diagram` / `timetable-all-line` / `timetable-edit-form` の `fetchStations` | `ServiceQuery.findOneWithStations`（join が 3 者で微妙に異なる） | **新** `GET /v3/services/:id/stations`（join の和集合を常に返す） | edit-form が v2 で行っていた `stopName` ASC ソートは client 側で実施 |
| 10 | `operation-table` / `timetable-station` の `fetchStations` | `StationQuery.findMany`（空 qb） | **新** `GET /v3/stations` | なし |
| 11 | `operation-table` / `timetable-station` の `fetchTripClass(es)` | `TripClassQuery.findMany`（空 qb） | **既存** `TripClassQuery.findMany_V3` | なし |
| 12 | `timetable-edit-form` の `fetchTripClasses` | `TripClassQuery.findMany`（serviceId filter + sequence ASC） | **拡張** `GET /v3/trip-classes?serviceId=` | `sequence` ASC ソートは client 側で実施 |
| 13 | `timetable-station` の `fetchTrips` | `TripQuery.findMany`（複雑な search 条件） | **新** `GET /v3/trips/station/:stationId?calendarId=&tripDirection=`（条件はサーバー側に固定実装済み） | なし（qb の複雑な条件組み立てコードは削除） |
| 14 | `timetable-station` の `fetchOperations`、`operation-table` の `fetchOperationTrips`（前段）、`operation-search-card`、`timetable-edit-form` の `fetchOperations`、`global-states/todays-operation-list.state.ts` | `OperationQuery.findMany`（calendarId eq + operationNumber ≠ '100' [+ sort]） | **既存** `OperationQuery.findManyByCalendarId` | `operationNumber !== '100'` の除外と必要なソートを **client 側**で行う（確立済みパターン: `operation-real-time.store.ts` の `.filter((o) => o.operationNumber !== '100')` を参照） |
| 15 | `operation-route-diagram` / `operation-table` の `findOneWithTrips` | `OperationQuery.findOneWithTrips`（join calendar / 空） | **新** `GET /v3/operations/:id/trips`（calendar 常時同梱） | なし |
| 16 | `timetable-all-line` の `fetchTripBlocksV2` | `TripBlockQuery.findMany`（2 段フェッチ: id 一覧 → 各 findOne） | **新** `GET /v3/trip-blocks?calendarId=&tripDirection=`（full レスポンスのため 2 段目不要）。`tripBlockId` 指定時は **新** `GET /v3/trip-blocks/:id` を単発で呼ぶ | 2 段フェッチコードを単発呼び出しに簡素化（ストアに入る最終データは同一であること） |
| 17 | `timetable-station` の `fetchTripBlocks` | `TripBlockQuery.findOne` ×N（join trips+times） | **新** `GET /v3/trip-blocks/:id` ×N | レスポンスに余分なネスト（tripOperationLists 等）が増えるが builder で従来 DTO に絞る |
| 18 | `timetable-edit-form` の `fetchTripBlocks` | `TripBlockQuery.findMany`（id eq filter） | **新** `GET /v3/trip-blocks/:id`（単発） | 結果を 1 要素配列に包んでストア格納（従来挙動を維持） |
| 19 | `timetable-edit-form` の `createTripBlocks` / `replaceTripBlock`、`timetable-all-line` の add/delete trip | `TripBlockCommand.createMany` / `replaceOne` / `addTripToTripBlock` / `deleteTripFromTripBlock`（qb は全箇所で空） | **新** `POST /v3/trip-blocks/bulk` / `PUT /v3/trip-blocks/:id` / `PATCH /v3/trip-blocks/:id/add-trip` / `PATCH /v3/trip-blocks/:id/delete-trip` | request body は不変。qb 引数を撤去 |

#### 5-C. 死コードの削除（移行とは独立に実施可。各削除前に grep で参照ゼロを確認し、結果を報告書に貼る）

調査済み（2026-06-11）の未使用 v2 連鎖。**削除前に必ず自分でも grep で再確認**すること:

- `OperationSightingQuery` の `findMany` / `findManyLatestGroupByOperation` / `findManyLatestGroupByFormation` と usecase の対応パススルー（ページからの呼び出し元なし。`findMany` の唯一の呼び出し元 `operation-past-time.service.ts` の `fetchOperationSightingsV2` 自体が下記の死コンポーネントからしか呼ばれていない）
- `operation-past-time` の旧コンポーネント連鎖: `operation-past-time-main-c`（参照元は自分の spec のみ）→ `operation-past-time-table-c`。現行ページは `operation-past-time-table` を使用
- `operation-past-time.service.ts` の `fetchOperationSightingsV2`
- `OperationQuery.findOne`（v2）、`StationQuery.findOne`（v2）— ページからの呼び出し元なし
- 各クエリファイルの v2 メソッドと `apiUrl` フィールドは、その移行が完了した時点で削除する

#### 5-D. 検証（移行 1 件ごと）

1. `npx jest` 全緑 + `npm run build:prod` 成功。
2. 開発サーバー（`npm run dev`）で該当ページを開き、表示と操作（特に #19 の時刻表編集系は登録・置換・スジ移動まで）を目視確認。確認内容を報告書に記録。
3. 全件完了後 `grep -rn "/v2/" src/` が 0 件であることを確認し報告（0 件 = API 側の v2 削除が可能になる）。
4. 仕上げに `@nestjsx/crud-request` への import が残っていないことを確認し、残存ゼロなら依存を package.json から外してよい（ビルドが通ることを確認）。

### Phase 6: 提案書の作成（実装しない）
- 状態管理パターン統一のページ別移行計画（依存するグローバルストアの一覧付き）
- timetable 三つ子ページの統合案
- 日時・ユーティリティライブラリ統一案（v3 移行完了後なら `@nestjsx/crud-request` の依存削除も候補に含める）
- エラー通知 UX の改善案

## Verification Requirements

- 各フェーズ末に `npx jest`（失敗数を記録）と `npm run build:prod` を実行する。
- Phase 4 のファイル移動・モジュール変更後は開発サーバーでの目視確認が望ましいが、最低限ビルドとテストの緑を確認する。
- 「動くはず」での完了宣言は禁止。コマンド出力を貼ること。

## Reporting Format

```
## 実施内容
- フェーズごとの変更概要とコミット一覧

## 検証結果
- ベースライン値と最終値の対比（Jest: 94 failed → N failed 等）

## 未実施・提案事項
- Phase 6 の提案内容
- v2→v3 移行の残作業（API 側未提供分の一覧）
- 書き直しが必要と判断したテストの一覧（理由付き）
- 発見したプロダクションコードのバグ疑い（修正せず報告）

## 質問
- Stop And Ask に該当して停止した項目
```

## Out-of-scope Items

- 状態管理パターンの全面統一、RxJS → Signal の全面移行
- SSR コードの削除（将来有効化予定のため保持。ユーザー決定済み）
- 日時・ユーティリティライブラリの統一
- `initialDataResolver` の最適化
- デプロイワークフローの変更
- 他リポジトリへの変更

## Cross-repo Dependencies（他リポジトリとの関係）

- **sotetsu-lab-v3-api**: 本クライアントのデータ元。**作業順序: ①API 側が v3 エンドポイントを新設（api の指示書 Phase 4） → ②本リポジトリ Phase 5 で v2→v3 移行 → ③移行デプロイ完了後に API 側が v2 を削除（将来の別タスク）**。本リポジトリの作業中に API 側のコードを変更してはならない。
- **sotetsu-lab-v3-backend**: ログイン・トークン取得 BFF。cookie（`sessionId`, `loggedIn`）とトークンレスポンス形式に依存。
- **sotetsu-lab-v3-socket**: `SocketService` の接続先。token のクエリパラメータ渡しと `send-sighting` メッセージ形式に依存。

# Elf からの移行 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** client のストアを全部 Elf から NgRx SignalStore に移し、設定と圏外用の保存をストアの部品にする。

**Architecture:** まず `core/` に部品を作る。保存の下請け `DeviceStorage`、`withSettingsStorage`、`withOfflineSnapshots`、`withAppDevtools` だ。そのうえで、グローバルの状態からページへ、1 つずつ SignalStore（`providedIn: 'root'`）に置き換える。移す途中は Elf と SignalStore が混ざる。ただし、どのコミットでもビルドとテストは通る。最後に Elf を消し、文書を書き直し、実地で確かめる。

**Tech Stack:** Angular 22.2、`@ngrx/signals` 22.0.1（`@ngrx/signals/entities`・`@ngrx/signals/testing`）、`@ngrx-toolkit/core` 22.0.1（`withDevtools` だけ）、localforage 1.10.0、jest 30。

**Spec:** `docs/superpowers/specs/2026-10-27-remove-elf-design.md`

## Global Constraints

- 依存：`@ngrx/signals@22.0.1` と `@ngrx-toolkit/core@22.0.1` を入れる。`@ngrx/store` と `@angular-architects/ngrx-toolkit` は入れない。toolkit の `withStorageSync`・`withIndexedDB` は使わない。
- ストアは全部 `signalStore({ providedIn: 'root' }, ...)` で作る。
- localforage を import してよいのは、`core/storage/device-storage.ts` と `src/main.ts`（`localForage.config` は名前を変えない）だけ。
- 設定のキーと形は今と同じ（spec 7.1 の表）。圏外用の保存のキー（`offline-snapshot:<key>`）・形・版 1・戻す決まりも今と同じ（spec 8.1）。
- 画面の見た目と振る舞いは変えない。
- 読む側は signal にそろえる。Elf の `xxx$` と `get xxx` はやめる。RxJS の流れの中でしか使えない所だけ `toObservable` を使う。
- 書き込みメソッドの名前は今のまま保つ。
- テストは `TestBed.inject(Store)` で受ける。ストアの中身を直接書くときは `patchState(unprotected(store), ...)` を使う。
- コミット：Conventional Commits＋絵文字（`refactor: :recycle: …`、`build: :package: …`、`test: …`、`docs: :memo: …`）。本文は日本語。署名つきで、サンドボックスの外でコミットする。
- コマンド（Node 24）：
  - jest：`PATH=/home/seapolis/.local/share/mise/installs/node/24.22.0/bin:$PATH MISE_DISABLE_TOOLS=node node node_modules/jest/bin/jest.js --testPathPatterns=<パス>`。結果の `Tests:` 行は、出力をファイルに書いて読む。
  - tsc：同じ PATH で `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit` と `-p tsconfig.spec.json`。
  - lint と build はサンドボックスの外で動かす（`npm run lint`・`npx ng build -c production`）。
- パイプでコマンドをつながない（1 コマンド 1 目的）。素の `git stash` は使わない。`x.txt` は add しない。

## Review Focus

1. **`toObservable` は同期で値を出さない。** Elf の `select` は購読したその場で値を出していた。`toObservable` は effect の後に出す。購読した直後の値に頼る所（`take(1)` や、`combineLatest` の後の同期の読み取り）は、`store.x()` を直接読む形に書き換える。→ グローバルの状態の作業（Task 3〜5）の手順に入れ、各作業の spec で読む値を確かめる。
2. **一覧の並び順。** Elf の `selectAllEntities` は `setEntities` に渡した順で返していた。`withEntities` の `entities` も ids の順で返すので、同じ順を保つ。`setAllEntities` で置き換え、並べ替えはしない。→ Task 4 と 5 で、「渡した順のまま返る」spec を足す。
3. **設定の読み込み前の書き込み。** ページを開いた直後にストアが既定値を書いても、保存された設定を上書きしてはいけない。→ Task 1 の spec 7 で押さえる。
4. **古い丸ごと保存が残った端末。** 全線時刻表とダイヤグラムのキーには、絞る前の丸ごと保存（数 MB の列車データ）が残っていることがある。読んでも、データは戻さずに項目だけを拾う。→ Task 1 の spec 1・2 で押さえる。
5. **SSR の同時描画で値が混ざる。** ファイル先頭の `fetchSeq` などを全部ストアに移す。→ 各ページの作業の手順に入れ、Task 16 の確かめで押さえる。

---

## ファイルの地図

- 作る：
  - `src/app/core/storage/device-storage.ts`（＋spec）
  - `src/app/core/store-features/with-settings-storage.ts`（＋spec）
  - `src/app/core/store-features/with-offline-snapshots.ts`（＋spec）
  - `src/app/core/store-features/with-app-devtools.ts`
- 変える：
  - `src/app/core/offline/offline-snapshots.ts`（localforage を `DeviceStorage` に替える）
  - `src/app/core/resolvers/page.resolver.ts`
  - `src/app/global-states/*.state.ts`（12）
  - `src/app/core/resolvers/initial-data.resolver.ts`
  - 各ページの `stores/*.store.ts`・コンポーネント・サービス・route・spec
  - `src/app/shared/operation-post-card/*`
- 消す：
  - `src/app/core/utils/reset-elf-stores.ts`（＋spec）
  - `main.ts` と `app.config.server.ts` の Elf の行
  - `package.json` の `@ngneat/elf*` 4 つ
- 文書：`CLAUDE.md`、`docs/adr/0016-remove-elf.md`（新規）、`docs/adr/0015-offline-snapshots.md`（追記）

---

## 共通の手順 A：ページのストアの移し方

Task 6〜15 は、どれもこの手順で移す。各作業には、そのページだけの値を書いてある。

1. **ストアのファイル**（`stores/<feature>.store.ts`）を、次の形に書き換える。
   ```ts
   export const XStore = signalStore(
       { providedIn: 'root' },
       withState<StoreProps>(initialState),
       withComputed(...),
       withMethods(...),
       [withSettingsStorage],
       [withFeature(withOfflineSnapshots)],
       withAppDevtools('XStore'),
       withHooks(...),
   );
   ```
   - `withComputed`：今の `xxx$` のうち state の項目そのままでないものを、`$` を外した同じ名前の `computed` にする。state の項目そのままの `xxx$` は、state の signal があるので作らない。
   - `withMethods`：今の書き込みメソッドを、同じ名前のまま `patchState` で書く。`get xxx` は消す。使う側は `store.xxx()` を読む。
   - `withSettingsStorage<StoreProps>({ key, fields, debounceMs })`：作業ごとに指定がある所だけ付ける。
   - `withFeature((store) => withOfflineSnapshots({ ... }))`：作業ごとに指定がある所だけ付ける。`select` は今の `snapshot()` 系、`apply` は今のコンポーネントの `apply` の中身を、`store` のメソッドで書く。
   - `withAppDevtools('XStore')`：名前は今の `createStore` の name。
   - `withHooks({ onInit(store) { store.resetLoading(); } })`：コンポーネントのファイル先頭の `XStore.resetLoading();` を消して、ここに移す。
2. **ファイル先頭の変わる値**（`let fetchSeq` など）は、`withMethods` の factory の中の変数にする。そのうえで、次の 2 つのメソッドで出す。
   - `nextFetchSeq(): number`：1 増やした値を返す。
   - `isLatestFetch(seq: number): boolean`：いちばん新しい値なら true。

   コンポーネントは、`++fetchSeq` を `store.nextFetchSeq()` に、`seq === fetchSeq` を `store.isLatestFetch(seq)` に置き換える。
3. **コンポーネント**：`readonly #store = inject(XStore);` を置く。`toSignal(XStore.foo$, ...)` は `this.#store.foo` にする（テンプレートが読む名前は変えない）。`afterFirstRender(toSignal(...), fallback)` は `afterFirstRender(this.#store.foo, fallback)` にする。`OfflineSnapshots` の inject と `save`・`restore` の呼び出しは、`this.#store.saveOfflineSnapshot(name, conditions)`・`this.#store.restoreOfflineSnapshot(name, conditions)` に置き換える。取得の順番の守りと `try/catch` は今のまま残す。
4. **サービス・子コンポーネント**：`XStore.method()` を、`inject(XStore)` したインスタンスの呼び出しにする。
5. **route**：設定の保存があるページは、`pageResolver(XStore.persistInitialized$)` を `pageResolver(XStore)` にする。
6. **spec**：ストアを `TestBed.inject(XStore)` で受ける。ストアのファイルの spec があれば、Elf の値の読み方を signal に書き換える。コンポーネントの spec で、ストアのモジュールを `jest.mock` していた所は、本物のストアを inject して、`patchState(unprotected(store), ...)` で中身を入れる形にする。
7. **確かめ**：そのページのディレクトリで jest、tsc（app と spec）がすべて通る。`grep -rn "@ngneat/elf" <ページのディレクトリ>` が 0 件。
8. **コミット**：`refactor: :recycle: <ページ名> のストアを SignalStore に移す`。

## 共通の手順 B：グローバルの状態の移し方

Task 3〜5 は、どれもこの手順で移す。

1. `*StateStore` と `*StateQuery` を 1 つにまとめる。`export const XxxState = signalStore({ providedIn: 'root' }, ...)` にし、ファイル名は変えない。
2. 一覧は `withEntities(entityConfig({ entity: type<Dto>(), selectId: (e) => e.<idKey> }))` で持つ。Elf の `setEntities` は `setAllEntities` に置き換える。
3. `fetch(...)` は、引数と戻り値（`Observable<void>`）を今のまま保つ。`withMethods` の中で `inject` した libs のサービスを使う。
4. 読む側の名前は、今の Query の名前から `$` を外したものにする（`agencies$`・`get agencies` → `agencies` の computed）。他のグローバルの状態を読む computed は、`withComputed` の factory で `inject(OtherState)` して作る。
5. 使う側では、`inject(XxxStateStore)`・`inject(XxxStateQuery)` を `inject(XxxState)` に替える。
   - コンポーネントでは、`toSignal(query.foo$)` を `state.foo` にする。
   - サービスで RxJS の流れに入れている所は、1 回だけ読むなら `state.foo()` を直接読む。流れとして変化を追う所だけ `toObservable(state.foo)` を使う（Review Focus 1）。
6. spec を `TestBed.inject(XxxState)` にする。一覧には「`fetch` に渡した順のまま返る」spec を足す（Review Focus 2）。
7. 確かめ：`src/app` 全体の jest と tsc（app と spec）が通る。グローバルの状態は使う所が広いので、全体で回す。
8. コミット：`refactor: :recycle: <対象> のグローバルの状態を SignalStore に移す`。

---

### Task 1: 依存と保存の部品

**Files:**
- Modify: `package.json`・`package-lock.json`
- Create: `src/app/core/storage/device-storage.ts`・`device-storage.spec.ts`
- Create: `src/app/core/store-features/with-settings-storage.ts`・`with-settings-storage.spec.ts`
- Create: `src/app/core/store-features/with-offline-snapshots.ts`・`with-offline-snapshots.spec.ts`
- Create: `src/app/core/store-features/with-app-devtools.ts`
- Modify: `src/app/core/offline/offline-snapshots.ts`（と spec）

**Interfaces:**
- Produces:
  - `@Injectable({ providedIn: 'root' }) class DeviceStorage { getItem<T>(key: string): Promise<T | null>; setItem<T>(params: { key: string; value: T }): Promise<void>; removeItem(key: string): Promise<void>; }`
    - サーバーでは `getItem` が null を返し、他は何もしない。localforage の失敗は握りつぶす（`getItem` は null）。
  - `withSettingsStorage<State extends object>(config: { key: string; fields: readonly (keyof State)[]; debounceMs?: number }): SignalStoreFeature`
    - props に `settingsReady: Signal<boolean>` を足す。
    - 作りは `signalStoreFeature({ state: type<State>() }, withProps(...), withHooks(...))`。
  - `interface OfflineSnapshotDef<T> { key: string; select: () => T; apply: (data: T, savedAt: number) => void }`
  - `withOfflineSnapshots<Name extends string>(defs: Record<Name, OfflineSnapshotDef<any>>): SignalStoreFeature`
    - methods `saveOfflineSnapshot(name: Name, conditions: OfflineConditions): Promise<void>` と `restoreOfflineSnapshot(name: Name, conditions: OfflineConditions): Promise<OfflineSnapshot<unknown> | null>` を足す。
    - 中は `inject(OfflineSnapshots)` の `save`・`restore` に渡すだけ。`apply` が投げた例外は、呼び手に投げ返す。
    - ストアの定義では `withFeature((store) => withOfflineSnapshots({ main: { key: 'OperationTable', select: () => store.snapshot(), apply: (d) => store.restoreSnapshot(d) } }))` のように使う。
  - `withAppDevtools(name: string)`：`environment.production` なら `withDevToolsStub(name)`、そうでなければ `withDevtools(name)`。どちらも `@ngrx-toolkit/core` から使う。

- [ ] **Step 1: 依存を入れる**

  サンドボックスの外で `npm install @ngrx/signals@22.0.1 @ngrx-toolkit/core@22.0.1` を打つ。`package.json` には、他の依存と同じ `^` つきで入る。

- [ ] **Step 2: コミット**

  `build: :package: @ngrx/signals と @ngrx-toolkit/core を入れる`

- [ ] **Step 3: `DeviceStorage` の spec を書く**

  localforage を `jest.mock` する。
  - `getItem` は localforage の値を返す。
  - `getItem` は、localforage が reject したら null を返す。
  - `setItem` は、localforage が reject しても resolve する。
  - サーバー（`{ provide: PLATFORM_ID, useValue: 'server' }`）では、`getItem` が null を返し、localforage を一度も呼ばない。

- [ ] **Step 4: 失敗を確かめ、`DeviceStorage` を書き、通す**

- [ ] **Step 5: `OfflineSnapshots` を `DeviceStorage` 経由にする**

  `OfflineSnapshots` の localforage 呼び出しを `DeviceStorage` に替える。今の spec は、localforage の mock のまま通るはずだ（`DeviceStorage` が中で使うため）。通らなければ、spec を `DeviceStorage` の mock に寄せる。振る舞いは変えない。

- [ ] **Step 6: `withSettingsStorage` の spec を書く**

  テスト用に `signalStore` を作る。state は `{ selectedGroupNames: string[]; trips: string[]; loading: boolean }`、`fields: ['selectedGroupNames']`、`debounceMs: 100` とする。`DeviceStorage` は mock にする。jest の偽タイマーを使う。
  1. 保存の値が `{ selectedGroupNames: ['A'], trips: ['x'] }` なら、読み込み後の state は `selectedGroupNames` が `['A']`、`trips` が `[]`（初期値のまま）。
  2. 1 のとき、`setItem` が `{ key, value: { selectedGroupNames: ['A'] } }` で 1 回だけ呼ばれる（古い丸ごと保存を小さくする）。保存の値が `{ selectedGroupNames: ['A'] }` だけなら、`setItem` は呼ばれない。
  3. 保存が null なら、`settingsReady()` が true になり、`setItem` は呼ばれない。
  4. 読み込み後に `selectedGroupNames` を `['B']` にする。99ms では `setItem` が呼ばれず、100ms で `{ selectedGroupNames: ['B'] }` が 1 回書かれる。
  5. 読み込み後に `trips` だけを変えても、`setItem` は呼ばれない。
  6. サーバーでは、`settingsReady()` が最初から true で、`getItem` も `setItem` も呼ばれない。
  7. 読み込みが済む前に `selectedGroupNames` を `['C']` にしても、`setItem` は呼ばれない。読み込みが済むと、state は保存の値（`['A']`）になる。
  8. 保存の値で項目が `undefined` なら、その項目は戻さない。`null` なら null を戻す。

- [ ] **Step 7: 失敗を確かめ、`withSettingsStorage` を書き、通す**

  - 読み込みは `withHooks.onInit` で行う。
  - 書き込みの見張りは、読み込みが済んでから始める。見張る値は、`fields` を拾った値だ。比べるときは、拾った値を `JSON.stringify` した文字列で比べる。
  - 間引きは `debounceMs`（既定 0）。
  - `onInit` の中で `inject` が要るなら、`withHooks((store) => { const storage = inject(DeviceStorage); return { onInit() {...} }; })` の形にする。

- [ ] **Step 8: `withOfflineSnapshots` の spec を書く**

  `OfflineSnapshots` を mock にする。
  - `saveOfflineSnapshot('main', { calendarId: 'c1' })` は、`save({ key: 'K', conditions: { calendarId: 'c1' }, data: select() })` を呼ぶ。
  - `restoreOfflineSnapshot('main', c)` は、`restore` に同じ key と conditions を渡す。`restore` が `apply(data, savedAt)` を呼んだら、def の `apply` に同じ引数が届く。
  - `restore` の戻り値（null または snapshot）を、そのまま返す。
  - def が 2 つ（`main`・`sightings`）あるとき、それぞれ別の key で呼ばれる。

- [ ] **Step 9: 失敗を確かめ、`withOfflineSnapshots` と `withAppDevtools` を書き、通す**

- [ ] **Step 10: `src/app/core` の jest と tsc（app と spec）を通す**

- [ ] **Step 11: コミット**

  `refactor: :recycle: 設定と圏外用の保存をストアの部品にする`

### Task 2: ページのリゾルバーと初期化の状態

**Files:**
- Modify: `src/app/core/resolvers/page.resolver.ts`（＋spec）
- Modify: `src/app/global-states/initialize.state.ts`
- Modify: `src/app/core/resolvers/initial-data.resolver.ts`（＋spec）
- Modify: `InitializeStateQuery`・`InitializeStateStore` を使う所（`grep -rln "InitializeState" src/app`）

**Interfaces:**
- Consumes: `withSettingsStorage` の `settingsReady`（Task 1）。
- Produces:
  - `pageResolver(settings?: ProviderToken<{ settingsReady: Signal<boolean> }> | Observable<boolean>): ResolveFn<void>`
    - 移す途中は、`Observable<boolean>` も受ける。`Observable<boolean>` を受ける分岐は Task 15 で消す。
    - token を受けたら、`inject` して `settingsReady` が true になるのを待つ。
  - `export const InitializeState = signalStore({ providedIn: 'root' }, withState({ isInitialized: false }), withMethods(... markInitialized(): void ...))`

- [ ] **Step 1: `page.resolver.spec.ts` に足す**

  - token を渡し、`settingsReady` が false の間は値を出さず、true にすると `undefined` を 1 回出す。
  - 引数なしなら、初期化が済んだらすぐ出す。

- [ ] **Step 2: 失敗を確かめ、リゾルバーを書き、通す**

  初期化を待つ所も `inject(InitializeState).isInitialized` を `toObservable` して待つ形にする。

- [ ] **Step 3: `InitializeState` に置き換える**

  `InitializeStateStore`・`InitializeStateQuery` を `InitializeState` に置き換え、使う所をすべて直す。ファイル先頭の `signal` は消す。

- [ ] **Step 4: 全体の jest と tsc（app と spec）を通す**

- [ ] **Step 5: コミット**

  `refactor: :recycle: ページのリゾルバーと初期化の状態を DI に置く`

### Task 3: グローバルの状態（値だけのもの）

共通の手順 B で移す。対象は `token.state.ts`・`user.state.ts`・`feature-flag.state.ts`・`maintenance.state.ts` の 4 つ。一覧ではないので `withEntities` は使わず、`withState` で持つ。Elf の `state.reset()` は、初期値を `patchState` する `reset()` メソッドにする（`user.state.ts` に 3 か所、`feature-flag.state.ts` に 1 か所）。各ファイルの spec（token・user・feature-flag）が通ること。

### Task 4: グローバルの状態（一覧・全体のもの）

共通の手順 B で移す。対象と idKey は次のとおり。
- `agency-list.state.ts`（`agencyId`）
- `calendar-list.state.ts`（`calendarId`）
- `route-station-list.state.ts`（`routeId`）
- `service-list.state.ts`（`serviceId`）

`route-station-list.state.ts` は 175 行あり、派生の読み取りが多い。全部を `withComputed` に移す。

### Task 5: グローバルの状態（今日のもの）

共通の手順 B で移す。対象は次の 3 つ。
- `todays-calendar-list.state.ts`（`calendarId`）
- `todays-operation-list.state.ts`（`operationId`）
- `todays-formation-list.state.ts`（`formationId`）

`todaysFormationsSorted` は、会社の一覧と路線の一覧を読む computed にする。`initial-data.resolver.ts` は、ここまでの `*State` を inject する形に直す（取る順と、サーバーでは取らないものの区別は今のまま）。

### Task 6: 投稿カードと時刻表の入力

共通の手順 A で移す。
- `shared/operation-post-card/operation-post-card.store.ts` → `OperationPostCardStore`
  - `withSettingsStorage({ key: 'OperationPostCardStore', fields: ['serviceAgencies'], debounceMs: 100 })`
  - `agencies$` の会社の並びは、そのまま `agencies` の computed にする。
- `pages/timetable/timetable-edit-form/stores/timetable-edit-form-draft.store.ts` → `TimetableEditFormDraftStore`
  - `withSettingsStorage({ key: 'TimetableEditFormDraftStore', fields: ['draft'], debounceMs: 800 })`
  - route は `pageResolver(TimetableEditFormDraftStore)`。
  - `draftMatchesContext` は純粋関数なので、そのまま残す。
- `pages/timetable/timetable-edit-form/stores/timetable-edit-form.store.ts` → `TimetableEditFormStore`
  - 保存なし。`fetchSeq` あり。

### Task 7: トップ（dashboard）

共通の手順 A で移す。
- `withSettingsStorage({ key: 'DashboardStore', fields: ['hasVisitedBefore'] })`。今の `pickDashboardSettings` と、`persist.initialized$` の書き戻しは消す（部品が受け持つ）。
- `withOfflineSnapshots({ main: { key: 'Dashboard', ... } })`
- route は `pageResolver(DashboardStore)`。

### Task 8: 運用表（operation-table）

共通の手順 A で移す。
- `withSettingsStorage({ key: 'OperationTableStore', fields: ['selectedGroupNames'] })`。`pickOperationTableSettings` と書き戻しは消す。
- `withOfflineSnapshots({ main: { key: 'OperationTable', ... } })`
- `fetchSeq` あり。route は `pageResolver(OperationTableStore)`。

### Task 9: 過去の運用情報（operation-past-time）

共通の手順 A で移す。
- 保存なし。
- `withOfflineSnapshots({ main: { key: 'OperationPastTime', ... } })`
- `fetchSeq` あり。

### Task 10: 運用行路図（operation-route-diagram）

共通の手順 A で移す。
- 保存なし。
- `withOfflineSnapshots({ main: { key: 'OperationRouteDiagram', ... } })`
- `fetchSeq` と `calendarChangeSeq` あり。`calendarChangeSeq` も、`nextCalendarChangeSeq()`・`isLatestCalendarChange(seq)` の同じ形で出す。

### Task 11: real-time（operation-real-time）

共通の手順 A で移す。
- `withSettingsStorage({ key: 'OperationRealTimeStore', fields: ['selectedAgencyIds', 'selectedGroupNames', 'isEnableAutoReload', 'isVisibleSightingHistories', 'isVisibleCurrentPosition'], debounceMs: 1000 })`。`PERSISTED_KEYS`・`pickPersistedProps`・`persistStorage` は消す。
- `withOfflineSnapshots({ main: { key: 'OperationRealTime', apply: (d, savedAt) => store.restoreSnapshot(d, savedAt) } })`。最終更新に保存時刻を出すためだ。
- ファイル先頭の `const firstLoading = signal(true)` は、state の `firstLoading: boolean`（初期値 true）と、それを書くメソッドにする。
- route は `pageResolver(OperationRealTimeStore)`。

### Task 12: 駅別時刻表（timetable-station）

共通の手順 A で移す。
- 保存なし。
- `withOfflineSnapshots` に def を 2 つ置く。
  - `main`（key `'TimetableStation'`）
  - `sightings`（key `'TimetableStationSightings'`、apply は `store.restoreOperationSightingTimeCrossSections(d)`）
- 日付つきの条件の組み立ては、コンポーネントに残す。
- `fetchSeq` あり。

### Task 13: 全線時刻表（timetable-all-line）

共通の手順 A で移す。
- `withSettingsStorage({ key: 'TimetableAllLineStore', fields: ['controlCollapsed'] })`
- `withOfflineSnapshots({ main: { key: 'TimetableAllLine', apply: (d) => { store.restoreSnapshot(d); store.initializeSelectedRouteIds(); } } })`
- `fetchSeq` あり。route は `pageResolver(TimetableAllLineStore)`。

### Task 14: 列車ダイヤグラム（train-diagram）

共通の手順 A で移す。
- `withSettingsStorage({ key: 'TrainDiagramStore', fields: ['controlCollapsed'] })`
- `withOfflineSnapshots` に def を 2 つ置く。
  - `main`（key `'TrainDiagram'`）
  - `sightings`（key `'TrainDiagramSightings'`、apply は `store.restoreOperationSightingTimeCrossSections({ ...d, ...store.operationSightingTimeCrossSections() })`）
- `fetchSeq` あり。route は `pageResolver(TrainDiagramStore)`。
- コンポーネントは 1,000 行を超える。ストアの読み書きの置き換え以外は触らない。

### Task 15: 列車位置情報（train-location）と Elf の後始末

共通の手順 A で列車位置情報を移す。
- 保存なし。
- `withOfflineSnapshots` に def を 2 つ置く。
  - `main`（key `'TrainLocation'`）
  - `sightings`（key `'TrainLocationSightings'`、apply は今と同じく、今の値に重ねる）
- 「戻すのは条件ごとに 1 回」（`#sightingsRestoredFor`）と「links の取得に失敗した後は保存しない」（`#isLinksDegraded`）は、コンポーネントに残す。
- `fetchSeq` あり。

そのあと、Elf を消す。

- [ ] **Step 1: 列車位置情報を移し、ページの jest と tsc を通してコミットする**

- [ ] **Step 2: Elf の残りを消す**
  - `src/app/core/utils/reset-elf-stores.ts` と spec を消す。
  - `app.config.server.ts` から `provideAppInitializer(() => resetElfStores())` と import と、その前のコメントを消す。
  - `main.ts` から `enableElfProdMode()`・`devTools()` と、その import を消す（`localForage.config` は残す）。
  - `pageResolver` の `Observable<boolean>` を受ける分岐を消す。
  - `npm uninstall @ngneat/elf @ngneat/elf-devtools @ngneat/elf-entities @ngneat/elf-persist-state` をサンドボックスの外で打つ。

- [ ] **Step 3: 残りが 0 件であることを確かめる**
  - `grep -rn "@ngneat/elf" src package.json` が 0 件。
  - `grep -rln "from 'localforage'" src` が `src/main.ts` と `src/app/core/storage/device-storage.ts` の 2 件だけ。
  - `grep -rnE "^let fetchSeq|^let calendarChangeSeq|^const firstLoading" src/app` が 0 件。

- [ ] **Step 4: 全体を通す**

  全体の jest、tsc（app と spec）、`npm run lint`、`npx ng build -c production` を通す。

- [ ] **Step 5: 2 つに分けてコミットする**
  - `build: :package: Elf を外す`：package.json と lock だけ。
  - `refactor: :recycle: Elf の後始末をする`：残りのコード。

- [ ] **Step 6: 文書を書く**
  - `CLAUDE.md` の「`global-states/`」と「ストア（`stores/*.store.ts`）」の節を、新しい書き方で書き直す。共通の手順 A の形と、例のコード（`withSettingsStorage`・`withOfflineSnapshots` を含む）を載せる。
  - `docs/adr/0016-remove-elf.md` を書く。中身は spec 11 章の 4 点（Elf をやめたわけ、SignalStore を選んだわけ、`withStorageSync` を使わなかったわけ、保存の部品を 2 つに分けたわけ）。
  - `docs/adr/0015-offline-snapshots.md` に、保存と復元の呼び出しがストアの部品に移ったことを 1 段落足す。
  - コミット：`docs: :memo: Elf からの移行を CLAUDE.md と ADR に書く`。

### Task 16: 実地の確かめ（spec 10 章）

これは controller が自分でやる。サブエージェントには渡さない。道具は 2b と同じものを使う。
- `.context/ssr-plan/2b-offline/static-server.mjs` で本番ビルドを配る。
- Playwright は、新しい context に `serviceWorkers: 'allow'` を付けて開く。
- CORS は中継し、圏外は `setOffline` で作る。

- [ ] **Step 1: 2 つのビルドを作る**

  移す前（master 47582292）と移した後の本番ビルドを、別のディレクトリに作る。移す前のビルドは worktree で作る。

- [ ] **Step 2: 設定の引き継ぎ（10 章の 3）**
  1. 同じポート（4300）で移す前のビルドを配り、7 キーの設定を全部変える。運用表とトップでは、圏外用の保存も作る。
  2. 配るものを移した後のビルドに替え、同じ context で開く。
  3. 設定が全部残っていることを確かめる。

- [ ] **Step 3: 圏外の確認（10 章の 4）**

  2b の手順をもう一度通す。確かめるのは次のとおり。
  - 移す前に作った保存が戻る。
  - 知らせ・保存時刻が出る。
  - real-time の最終更新が保存時刻になる。
  - 別の向きの駅では戻らない。
  - 列車位置情報の知らせは 1 回だけ。
  - アイコンが崩れない。

- [ ] **Step 4: 見た目の比較（10 章の 2）**

  全ページを、移す前と後で同じ URL・同じ幅（1440・390）でスクリーンショットに撮り、並べて目で比べる。ページを離れて戻ったとき、中身と設定が残っていることも見る。

- [ ] **Step 5: SSR（10 章の 5）**
  1. `npm run build:ssr-check` → `npm run ssr:check` が通ることを確かめる。
  2. 中身の違う 2 つの URL（例：駅別の 2 駅）を同時に 10 組投げる。それぞれの HTML の題名と駅名が自分のものだけであることを、`.context/m29/ssr-concurrent.mjs` で確かめる。

- [ ] **Step 6: 結果を台帳に書き、PR に載せる**

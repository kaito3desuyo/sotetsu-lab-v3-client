# M29 Elf からの移行（NgRx SignalStore へ）

2026-10-27。branch `refactor/remove-elf`（master 47582292 から）。ロードマップの M29。

## 1. 目的とわけ

client のストアは全部 Elf（`@ngneat/elf`・`elf-entities`・`elf-persist-state`・`elf-devtools`）で作ってある。Elf は開発が止まった。npm の最新は 2.5.1 と persist-state 1.2.1 で、2024-02 から版が出ていない。GitHub の ngneat の組織は公開リポジトリが 0 件で、有志の読み取り専用の写し（`ngneat-archive/elf`）しか残っていない。直らない弱点もある。persist-state は、setItem が 1 回失敗すると保存が止まる。`skip(1)` のせいで、起動直後の変更も落ちる。

もう 1 つのわけは SSR だ。今のストアはファイルの中に 1 つずつ作る const で、プロセスの中で使い回される。そのため SSR は、描くたびに `resetElfStores()`（`getRegistry().forEach(reset)`）で中身を空にしている。これは「1 プロセスが同時に描くのは 1 件」という前提に乗っている。2c（Lambda と配信で SSR を有効にする）はこの移行の後にやり、新しいストアを前提に組む（ユーザー判断 2026-10-27）。

## 2. ゴール・非ゴール・アンチゴール

**ゴール**

- ストアを全部 NgRx SignalStore（`@ngrx/signals`）に移し、`@ngneat/elf*` の依存と import を 0 にする。
- 画面の設定と下書きの保存は `@ngrx-toolkit/core` の `withStorageSync` と `withIndexedDB` に移す。
- ストアを DI に置き、SSR のリクエストごとに別のインスタンスにする。サーバーで同時に描いても中身が混ざらない。
- 開発ビルドでは Redux DevTools でストアを覗ける。

**非ゴール**

- 取ったデータの保存（`OfflineSnapshots`・ADR-0015）は変えない。今のまま localforage に書く。
- 画面の見た目と振る舞いは変えない。ロック済みのページも含む。
- `QueryCache`・`QueryInvalidator` は変えない。
- 2c の作業はしない。

**アンチゴール（動いても失敗とみなすこと）**

- 利用者の画面の設定が更新で消える。運用群の絞り込み、real-time の会社と表示の切り替え、操作帯の開閉、トップの既訪問、下書きがこれに当たる。
- ページを離れて戻ったとき、前の中身や設定が消えている。今はストアがアプリの生きている間ずっと残り、2b の Ruling 5 もそれに頼っている。
- SSR で前のリクエストの中身が次の HTML に出る。
- ページごとに古い書き方と新しい書き方が混ざったまま出す。

## 3. 制約

- 一度に全部を移し、1 回のリリースで出す（ユーザー判断）。途中の版は出さない。
- Angular 22。全部 OnPush・standalone・`inject()`。
- `@ngrx/signals` 22.0.1、`@ngrx-toolkit/core` 22.0.1。`@angular-architects/ngrx-toolkit` は非推奨なので使わない。`@ngrx-toolkit/core` の peer の `@ngrx/store` は optional なので入れない。
- localforage は残す。`OfflineSnapshots` と、古い保存の読み出しに使う。`main.ts` の `localForage.config`（DB `sotetsu-lab-v3-client`、storeName `elf_state`）は名前を変えない。変えると 2b の保存と古い設定が読めなくなる。
- 版上げは patch（refactor・build だけ。利用者の使い方は変わらない）。

## 4. 決めたこと

### ユーザーが決めたこと

- 移す先は NgRx SignalStore。依存が増えることは構わない。
- 一度に移して 1 回で出す。
- 設定の保存は `@ngrx-toolkit/core` の `withStorageSync` と `withIndexedDB` にする。初回起動のとき、古い localforage の値を 1 回だけ新しい保存へ写す（案イ）。
- Redux DevTools を使うので、開発だけ `withDevtools` を付ける。
- 完了の条件は 9 章のとおり。

### 私の判断（レビューで覆してよい）

- **全部 `providedIn: 'root'`**。ページを離れても中身が残る今の振る舞いを守るためだ（Ruling 5）。SSR では Angular がリクエストごとにアプリの injector を作り直すので、root のストアもリクエストごとに別になる。
- **`global-states/` の `*StateStore` と `*StateQuery` の組は、1 つの SignalStore にまとめる**。一覧は `withEntities` で持つ。ファイル名は `*.state.ts` のまま変えない（差分を小さくするため）。名前は `AgencyListState` のように付ける。`initialDataResolver` と、他のストアを読む computed（例：`todaysFormationsSorted` が会社の一覧を読む）は、`withComputed` の中で他のストアを `inject` して組む。
- **`initialize.state.ts` も DI に入れる**。Elf ではないが、ファイルの中の `signal` は SSR のリクエストの間で共有されてしまう。9 章の 5 を通すには、ここも直す必要がある。
- **ページのストアの名前は今のまま**にする（`OperationTableStore` など）。中身は `signalStore(...)` のクラスにし、使う側は `inject(OperationTableStore)` で受ける。
- **ストアを DI の外から触る所**：パイプとユーティリティ（`*.pipe.ts`・`*.util.ts`・`*.utils.ts`）にストアを読む所は無い（2026-10-27 に grep で確認）。DI の外で触っているのは、次の項目のファイル先頭の呼び出しだけだ。他にも見つかったら、`inject` できる呼び手から値を引数で渡す形にする。`runInInjectionContext` は使わない。
- **ファイルの先頭で呼んでいる `XxxStore.resetLoading()`（9 ページ）は、ストアの `withHooks.onInit` に移す**。今はチャンクを読んだときに 1 回だけ走る。onInit なら、ストアを作ったときに 1 回だけ走る。どちらも「アプリが生きている間に 1 回」なので、振る舞いは変わらない。
- **読む側の API**：Observable の `xxx$` と `get xxx` をやめ、signal（`store.xxx()`）にそろえる。コンポーネントの `toSignal(Store.x$)` は `store.x` を直接読む形に置き換える。RxJS の流れの中で要る所だけ `toObservable` を使う。
- **書く側**：今の書き込みメソッドの名前（`setCalendarId`、`enableLoading` など）を `withMethods` にそのまま移し、中は `patchState` にする。名前を保てば、サービスの差分は呼び方（`inject` するかどうか）だけで済む。
- **`protectedState` は既定（true）のまま**にする。spec でストアの中身を直接書きたいときは、`@ngrx/signals/testing` の `unprotected` を使う。
- **`pageResolver` の引数**：今は `persistInitialized$`（Observable）を route の定義で渡している。これを「保存を持つストアの token」を渡す形に変える。リゾルバーはブラウザでは `whenSynced()` を待つ。サーバーでは待たない（6.3 を参照）。
- **古い保存のキーは、写し終えたら消す**。古い丸ごと保存（数 MB）が IndexedDB に残り続けないようにするためだ。代わりに、この版から前の版へ戻すと設定は既定値に戻る。
- **新しい保存のキーは、古いキーと同じ文字列**にする（例：`OperationTableStore`）。DB が別なので衝突しない。

## 5. ストアの形

ページのストアの例（運用表）。細かい書き方は作り手に任せる。

```ts
export const OperationTableStore = signalStore(
    { providedIn: 'root' },
    withState<StoreProps>(initialState),
    withComputed((s) => ({
        isLoading: computed(() => s.loadingQueue().length > 0),
        // ...今の select をここへ
    })),
    withMethods((s) => ({
        setCalendarId(calendarId: string): void { patchState(s, { calendarId }); },
        enableLoading(): void { patchState(s, (st) => ({ loadingQueue: [...st.loadingQueue, true] })); },
        disableLoading(): void { patchState(s, (st) => ({ loadingQueue: st.loadingQueue.slice(1) })); },
        resetLoading(): void { patchState(s, { loadingQueue: [] }); },
    })),
    withSettingsStorage({ key: 'OperationTableStore', pick: pickOperationTableSettings }), // 6 章
    withAppDevtools('OperationTableStore'), // 7 章
    withHooks({ onInit: (s) => s.resetLoading() }),
);
```

`withSettingsStorage` と `withAppDevtools` は、この移行で `core/` に作る共通の部品だ。仮の名前で、置き場所と名前は作り手が決めてよい。

## 6. 画面の設定と下書きの保存

### 6.1 対象

今 `persistState` を使っている 7 つ。保存する中身は今と同じにする。

| キー | 保存する項目 | 今の間引き |
|---|---|---|
| `OperationPostCardStore` | `serviceAgencies`（投稿カードの会社の一覧。設定でなくデータだが、今も保存している） | 100ms |
| `DashboardStore` | `hasVisitedBefore` | なし |
| `TimetableAllLineStore` | `controlCollapsed` | なし |
| `TimetableEditFormDraftStore` | `draft` | 800ms |
| `OperationRealTimeStore` | `selectedAgencyIds`・`selectedGroupNames`・`isEnableAutoReload`・`isVisibleSightingHistories`・`isVisibleCurrentPosition` | 1000ms |
| `OperationTableStore` | `selectedGroupNames` | なし |
| `TrainDiagramStore` | `controlCollapsed` | なし |

### 6.2 下調べで分かった ngrx-toolkit の作り

`@ngrx-toolkit/core` 22.0.1 の `fesm2022/ngrx-toolkit-core.mjs` を読んで確かめた。

- `withIndexedDB` は、自分専用の DB（名前 `ngrxToolkitDb`、object store `ngrxToolkitStore`、keyPath `ngrxToolkitKeyPath`、版 1）に書く。名前は変えられない。localforage の DB とは別になる。
- 値は `stringify`（既定は `JSON.stringify`）した文字列で入る。`readFromStorage` は `parse` の結果をそのまま `patchState` する。
- `autoSync: true`（既定）は、ストアの state が少しでも変わるたびに `writeToStorage` する。`select` で絞るのは書く中身だけで、書く回数は絞られない。読み込みが済む前に state が変わると警告だけ出し、その書き込みは捨てる。
- **サーバーでは `onInit` が何もしない**。そのため同期の状態が `idle` のままで、**`whenSynced()` はずっと resolve しない**。`isSynced` も false のままになる。

### 6.3 使い方（決めたこと）

- `autoSync: false` にする。理由は 2 つある。real-time（10 秒ごと）や列車位置情報のように、データが頻繁に変わるページで毎回 IndexedDB を開かせないため。そして、起動直後の書き込みが古い保存を上書きする競合を避けるため。
- 書き込みは、`select` した設定の部分だけを見て、変わったときだけ書く。間引きは 6.1 の表の値を保つ。見張りを始めるのは、読み込み（6.4 の写しを含む）が済んでから。
- `parse` で、6.1 の表にある項目だけを拾う。今の `pickOperationTableSettings` などがやっている「古い丸ごと保存からデータを戻さない」守りを、新しい形でも続けるためだ。
- サーバーでは保存に触れない。`pageResolver` はサーバーでは `whenSynced()` を待たずに進む。待つと 6.2 のとおり永遠に止まる。

- 組み方は `withStorageSync({ key, select, parse, autoSync: false }, withIndexedDB())` だ。toolkit が出す `readFromStorage`・`writeToStorage`・`whenSynced` を、自前の `withHooks.onInit` から呼ぶ。`autoSync: false` なら toolkit の onInit は何も読まない。そのため、6.4 の写しを読み込みの前に挟める。同期の状態は、`readFromStorage` か `writeToStorage` を 1 回呼んだ時点で `synced` になる。だから onInit でどちらかを必ず呼べば、`whenSynced()` は resolve する（6.2 と同じファイルの `createAsyncStorageSync` で確認）。IndexedDB を直接叩く自前の実装は作らない。
- 下書き（`draft.trips`）は、保存の形が構造化複製から JSON に変わる。中身はフォームの値（`onFormValueChange` が受ける `unknown[]`）だ。spec で JSON の往復を確かめる。`Date` などで崩れるなら `stringify` と `parse` を足す。

### 6.4 古い保存からの写し（案イ）

ブラウザでストアを作ったとき、キーごとに次の順で行う。

1. localforage（今の DB）に `settings-migrated:<キー>` の印があるか見る。
2. 印がない場合：localforage に古いキーがあれば、6.1 の項目だけを拾ってストアに入れ、`writeToStorage` で新しい保存に書く。古いキーが無ければ `readFromStorage` だけをする。どちらの場合も、最後に印を書いて古いキーを消す。
3. 印がある場合：古いキーが残っていても読まずに消し、`readFromStorage` する。前の版を開いたままのタブが古いキーに書き戻しても、新しい保存は上書きされない。

写しの失敗（読めない・書けない）は握りつぶし、既定値のまま進む。今の persistState と同じ扱いだ。前の版へ戻すと、設定は既定値に戻る。その後でこの版に戻ると、戻す前に新しい保存へ書いた値が出る。どちらも受け入れる（私の判断）。

## 7. Redux DevTools

- 開発ビルドだけ `withDevtools(name)` を付ける。本番では `withDevToolsStub` などで、何もしない形にする。切り替え方は作り手に任せる。
- `main.ts` の `devTools()` と `enableElfProdMode()` は消す。
- `withDevtools` の中は `isPlatformBrowser` で守られているので、サーバーでは動かない（6.2 と同じファイルで確認）。

## 8. 消すもの・書き直すもの

- `core/utils/reset-elf-stores.ts` とその spec、`app.config.server.ts` の `provideAppInitializer(() => resetElfStores())` を消す。
- `package.json` から `@ngneat/elf`・`@ngneat/elf-devtools`・`@ngneat/elf-entities`・`@ngneat/elf-persist-state` を消す。
- CLAUDE.md の「`global-states/`」と「ストア（`stores/*.store.ts`）」の節を、新しい書き方で書き直す。例のコードも差し替える。
- ADR を 1 本足す（0016）。書くこと：Elf をやめたわけ、SignalStore と toolkit を選んだわけ、DB が 2 つになること、6.2 のサーバーの落とし穴、古いキーを消すこと。

## 9. 完了の条件

1. `@ngneat/elf*` の依存と import が 0 件。
2. 全ページを、移す前のビルドと実データで目で比べて同じ。ページを離れて戻ったときに、中身と設定が残っていることも見る。
3. 移す前のビルドで設定を変えてから新しいビルドを開くと、設定が引き継がれている（6.1 の 7 キーすべて）。古いキーは消えている。
4. 2b の圏外の確認がもう一度通る（知らせ・保存時刻・列車位置情報の知らせ 1 回）。
5. `ssr:check` が通る。加えて、サーバーで 2 つの URL を同時に描いても、互いの中身が HTML に出ないことを確かめる。
6. jest・lint・tsc（app と spec）・本番ビルドが通る。

## 10. 作り手に任せること

- `withSettingsStorage`・`withAppDevtools` の名前・置き場所・中の書き方。
- 作業の割り方。ただし、途中のコミットでもビルドとテストが通る順にする。
- spec の書き換え方。`TestBed.inject` にそろえることだけは決まっている。
- 9 章の 5 の「同時に描く」確かめ方。

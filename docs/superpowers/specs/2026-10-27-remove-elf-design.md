# M29 Elf からの移行（NgRx SignalStore へ）

2026-10-27。branch `refactor/remove-elf`（master 47582292 から）。ロードマップの M29。

## 1. 目的とわけ

client のストアは全部 Elf（`@ngneat/elf`・`elf-entities`・`elf-persist-state`・`elf-devtools`）で作ってある。Elf は開発が止まった。npm の最新は 2.5.1 と persist-state 1.2.1 で、2024-02 から版が出ていない。GitHub の ngneat の組織は公開リポジトリが 0 件で、有志の読み取り専用の写し（`ngneat-archive/elf`）しか残っていない。直らない弱点もある。persist-state は、setItem が 1 回失敗すると保存が止まる。`skip(1)` のせいで、起動直後の変更も落ちる。

もう 1 つのわけは SSR だ。今のストアはファイルの中に 1 つずつ作る const で、プロセスの中で使い回される。そのため SSR は、描くたびに `resetElfStores()`（`getRegistry().forEach(reset)`）で中身を空にしている。これは「1 プロセスが同時に描くのは 1 件」という前提に乗っている。2c（Lambda と配信で SSR を有効にする）はこの移行の後にやり、新しいストアを前提に組む（ユーザー判断 2026-10-27）。

## 2. ゴール・非ゴール・アンチゴール

**ゴール**

- ストアを全部 NgRx SignalStore（`@ngrx/signals`）に移し、`@ngneat/elf*` の依存と import を 0 にする。
- 画面の設定と下書きの保存は、自前の signalStore 部品 `withSettingsStorage` に移す。保存先は今の localforage で、キーと形も今のままにする。
- 取ったデータの保存（`OfflineSnapshots`・ADR-0015）も、自前の部品 `withOfflineSnapshot` でストアの定義に並べる。保存先・キー・形・戻す決まりは変えない。
- ストアを DI に置き、SSR のリクエストごとに別のインスタンスにする。サーバーで同時に描いても中身が混ざらない。
- 開発ビルドでは Redux DevTools でストアを覗ける。

**非ゴール**

- 圏外用の保存の決まり（取得に失敗し、条件が合うときだけ戻す。起動時には戻さない。戻したら知らせる）は変えない。
- 画面の見た目と振る舞いは変えない。ロック済みのページも含む。
- `QueryCache`・`QueryInvalidator` は変えない。
- localforage を別の道具（`idb-keyval` など）に替えることはしない（12 章）。
- 2c の作業はしない。

**アンチゴール（動いても失敗とみなすこと）**

- 利用者の画面の設定が更新で消える。運用群の絞り込み、real-time の会社と表示の切り替え、操作帯の開閉、トップの既訪問、下書きがこれに当たる。
- ページを離れて戻ったとき、前の中身や設定が消えている。今はストアがアプリの生きている間ずっと残り、2b の Ruling 5 もそれに頼っている。
- 圏外用の保存が起動時に戻る、または条件が違うのに戻る。
- SSR で前のリクエストの中身が次の HTML に出る。
- ページごとに古い書き方と新しい書き方が混ざったまま出す。

## 3. 制約

- 一度に全部を移し、1 回のリリースで出す（ユーザー判断）。途中の版は出さない。
- Angular 22。全部 OnPush・standalone・`inject()`。
- `@ngrx/signals` 22.0.1 を入れる。`@ngrx-toolkit/core` 22.0.1 は `withDevtools` のためだけに入れる（`@angular-architects/ngrx-toolkit` は非推奨なので使わない）。toolkit の `withStorageSync`・`withIndexedDB` は使わない（4 章）。`@ngrx-toolkit/core` の peer の `@ngrx/store` は optional なので入れない。
- localforage を触る所は、6 章の下請けだけに閉じ込める。`main.ts` の `localForage.config`（DB `sotetsu-lab-v3-client`、storeName `elf_state`）は名前を変えない。変えると、今の設定と 2b の保存が読めなくなる。
- 版上げは patch（refactor・build だけ。利用者の使い方は変わらない）。

## 4. 決めたこと

### ユーザーが決めたこと

- 移す先は NgRx SignalStore。依存が増えることは構わない。
- 一度に移して 1 回で出す。
- Redux DevTools を使うので、開発だけ `withDevtools` を付ける。
- 設定の保存は、toolkit の `withStorageSync` を使わず、自前の部品で今の localforage に書く。最初は案イ（toolkit＋古い値の写し）を選んだが、2026-10-27 に取り消した。toolkit の DB が別になるせいで、写し・古いタブ・前の版へ戻すときの扱いが要る。そのうえ、toolkit に任せる仕事がほとんど残らないからだ。
- 圏外用の保存もストアの部品にする。ただし、設定の保存とは別の部品にする（`withSettingsStorage` と `withOfflineSnapshot`）。2 つは戻す時機・書く時機・形が逆なので、1 つの部品に旗で混ぜない。共通の部分は下請けにまとめる（6 章）。
- 完了の条件は 10 章のとおり。

### 私の判断（レビューで覆してよい）

- **全部 `providedIn: 'root'`**。ページを離れても中身が残る今の振る舞いを守るためだ（Ruling 5）。SSR では Angular がリクエストごとにアプリの injector を作り直すので、root のストアもリクエストごとに別になる。
- **`global-states/` の `*StateStore` と `*StateQuery` の組は、1 つの SignalStore にまとめる**。一覧は `withEntities` で持つ。ファイル名は `*.state.ts` のまま変えない（差分を小さくするため）。名前は `AgencyListState` のように付ける。`initialDataResolver` と、他のストアを読む computed（例：`todaysFormationsSorted` が会社の一覧を読む）は、`withComputed` の中で他のストアを `inject` して組む。
- **`initialize.state.ts` も DI に入れる**。Elf ではないが、ファイルの中の `signal` は SSR のリクエストの間で共有されてしまう。10 章の 5 を通すには、ここも直す必要がある。
- **ページのストアの名前は今のまま**にする（`OperationTableStore` など）。中身は `signalStore(...)` のクラスにし、使う側は `inject(OperationTableStore)` で受ける。
- **ストアを DI の外から触る所**：パイプとユーティリティ（`*.pipe.ts`・`*.util.ts`・`*.utils.ts`）にストアを読む所は無い（2026-10-27 に grep で確認）。DI の外で触っているのは、次の項目のファイル先頭の呼び出しだけだ。他にも見つかったら、`inject` できる呼び手から値を引数で渡す形にする。`runInInjectionContext` は使わない。
- **ファイルの先頭で呼んでいる `XxxStore.resetLoading()`（9 ページ）は、ストアの `withHooks.onInit` に移す**。今はチャンクを読んだときに 1 回だけ走る。onInit なら、ストアを作ったときに 1 回だけ走る。どちらも「アプリが生きている間に 1 回」なので、振る舞いは変わらない。
- **読む側の API**：Observable の `xxx$` と `get xxx` をやめ、signal（`store.xxx()`）にそろえる。コンポーネントの `toSignal(Store.x$)` は `store.x` を直接読む形に置き換える。RxJS の流れの中で要る所だけ `toObservable` を使う。
- **書く側**：今の書き込みメソッドの名前（`setCalendarId`、`enableLoading` など）を `withMethods` にそのまま移し、中は `patchState` にする。名前を保てば、サービスの差分は呼び方（`inject` するかどうか）だけで済む。
- **`protectedState` は既定（true）のまま**にする。spec でストアの中身を直接書きたいときは、`@ngrx/signals/testing` の `unprotected` を使う。
- **`pageResolver` の引数**：今は `persistInitialized$`（Observable）を route の定義で渡している。これを「設定の保存を持つストアの token」を渡す形に変える。リゾルバーは、そのストアの準備完了（7.3）を待つ。

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
    withSettingsStorage({ key: 'OperationTableStore', pick: pickOperationTableSettings }), // 7 章
    withOfflineSnapshot({ key: 'OperationTable', select: ..., apply: ... }),             // 8 章
    withAppDevtools('OperationTableStore'),                                                // 9 章
    withHooks({ onInit: (s) => s.resetLoading() }),
);
```

`withSettingsStorage`・`withOfflineSnapshot`・`withAppDevtools` は、この移行で `core/` に作る部品だ。仮の名前で、置き場所と名前は作り手が決めてよい。

## 6. 保存の下請け（共通の部分）

`withSettingsStorage` と `withOfflineSnapshot` の両方が使う、小さな下請けを 1 つ作る。受け持つのは次の 3 つだけ。

- localforage への読み書き（`getItem`・`setItem`・`removeItem`）。
- サーバー（`isPlatformServer`）では何もしない。読むと `null`、書くと何もしない。
- 失敗（読めない・書けない）は握りつぶす。保存できなくても画面は動く。

今の `OfflineSnapshots` の中の localforage 呼び出しも、この下請けに寄せる。localforage を import する所は、この下請けと `main.ts` の `localForage.config` だけになる。

## 7. 画面の設定と下書きの保存（`withSettingsStorage`）

### 7.1 対象

今 `persistState` を使っている 7 つ。キーも保存する中身も今と同じにする。

| キー | 保存する項目 | 今の間引き |
|---|---|---|
| `OperationPostCardStore` | `serviceAgencies`（投稿カードの会社の一覧。設定でなくデータだが、今も保存している） | 100ms |
| `DashboardStore` | `hasVisitedBefore` | なし |
| `TimetableAllLineStore` | `controlCollapsed` | なし |
| `TimetableEditFormDraftStore` | `draft` | 800ms |
| `OperationRealTimeStore` | `selectedAgencyIds`・`selectedGroupNames`・`isEnableAutoReload`・`isVisibleSightingHistories`・`isVisibleCurrentPosition` | 1000ms |
| `OperationTableStore` | `selectedGroupNames` | なし |
| `TrainDiagramStore` | `controlCollapsed` | なし |

### 7.2 動き

- **起動したら必ず戻す**。ブラウザでストアを作ったとき（`withHooks.onInit`）に同じキーを読み、表の項目だけを拾ってストアに入れる。
- **拾うのは表の項目だけ**。古い版が丸ごと保存した値（数 MB）が残っている端末でも、データは戻さない。今の `pickOperationTableSettings`・`pickDashboardSettings`・real-time の `pickPersistedProps` の守りをこの部品に移す。全線時刻表とダイヤグラムには今この守りが無いが、移した後は全部のキーで拾う。
- **書くのは表の項目が変わったときだけ**で、間引きは表の値を保つ。見張りは読み込みが済んでから始める。起動直後の書き込みが、保存された値を既定値で上書きしないようにするためだ。
- 運用表とトップには今、読み込み後に設定だけの形で 1 回書き戻す処理がある（2b で足した。古い丸ごと保存を小さくするため）。これは保つ。
- 値はオブジェクトのまま localforage に入る（構造化複製）。今と同じなので、下書きの `Date` なども崩れない。
- キーと形が今と同じなので、古い保存からの写しは要らない。前の版へ戻しても、設定はそのまま読める。

### 7.3 準備完了の合図

- 部品は準備完了を表す signal（例：`settingsReady`）を出す。ブラウザでは読み込みが済んだら true になり、読めなかったときも true になる。サーバーでは最初から true にする。
- `pageResolver` はこれが true になるのを待つ。今の `persistInitialized$` を待つのと同じ役目だ。

## 8. 圏外用の保存（`withOfflineSnapshot`）

### 8.1 変えないこと

ADR-0015 と 2b の Ruling 1〜5 の決まりは全部保つ。

- 保存先は localforage で、キーは `offline-snapshot:<key>`。形は `{ version, conditions, savedAt, data }`、版は 1。キーと形が今と同じなので、利用者の端末に入っている保存はそのまま戻せる。
- 戻すのは、取得に失敗し、条件（ダイヤ・駅・向き・鉄道の日付など）が全部合うときだけ。起動時には戻さない。
- 戻したら「通信できないため、○時○分に保存した内容を表示しています」と知らせる。
- 目撃は、時刻表とは別のキーに日付つきで保存する（`TimetableStationSightings`・`TrainDiagramSightings`・`TrainLocationSightings`）。
- 列車位置情報の「戻すのは条件ごとに 1 回」と「links の取得に失敗した後は保存しない」、real-time の「最終更新に保存時刻を出す」も保つ。

### 8.2 変えること

- 今は 9 ページのコンポーネントが `OfflineSnapshots` を inject して `save`・`restore` を呼び、ストアの `snapshot()`・`restoreSnapshot(data)` を渡している。これを、ストアに付けた `withOfflineSnapshot` が持つメソッドに置き換える。コンポーネントは、取得に成功したら `store.saveSnapshot(conditions)` を呼び、失敗したら `store.restoreSnapshot(conditions)` を呼ぶ。
- 1 つのストアに保存のキーが 2 つあるページがある（時刻表と目撃）。そのため部品は、1 つのストアに複数のキーを持てる形にする。形は作り手に任せる。
- 何を保存するか（state のどこを切り出し、戻すときにどう入れるか）は、部品の設定としてストアの定義に書く。ストアを見れば、何を保存しているか分かるようにする。
- 取得の順番の守り（`fetchSeq` など、いちばん新しい取得だけが保存と復元をする）は、今どおりコンポーネント側に残す。
- `OfflineSnapshots` クラスは、部品の中身として残してもよいし、部品に溶かしてもよい（作り手に任せる）。

## 9. Redux DevTools

- 開発ビルドだけ `withDevtools(name)` を付ける。本番では `withDevToolsStub` などで、何もしない形にする。切り替え方は作り手に任せる。
- `main.ts` の `devTools()` と `enableElfProdMode()` は消す。
- `withDevtools` の中は `isPlatformBrowser` で守られているので、サーバーでは動かない（`@ngrx-toolkit/core` 22.0.1 の `fesm2022/ngrx-toolkit-core.mjs` で確認）。

## 10. 完了の条件

1. `@ngneat/elf*` の依存と import が 0 件。localforage を import するのは、6 章の下請けと `main.ts` だけ。
2. 全ページを、移す前のビルドと実データで目で比べて同じ。ページを離れて戻ったときに、中身と設定が残っていることも見る。
3. 移す前のビルドで設定を変えてから新しいビルドを開くと、設定が引き継がれている（7.1 の 7 キーすべて）。
4. 2b の圏外の確認がもう一度通る。確かめるのは、知らせ・保存時刻・real-time の最終更新・別の向きの駅で戻らないこと・列車位置情報の知らせ 1 回。移す前のビルドで保存した圏外用の保存が、新しいビルドで戻ることも見る。
5. `ssr:check` が通る。加えて、サーバーで 2 つの URL を同時に描いても、互いの中身が HTML に出ないことを確かめる。
6. jest・lint・tsc（app と spec）・本番ビルドが通る。

## 11. 消すもの・書き直すもの

- `core/utils/reset-elf-stores.ts` とその spec、`app.config.server.ts` の `provideAppInitializer(() => resetElfStores())` を消す。
- `package.json` から `@ngneat/elf`・`@ngneat/elf-devtools`・`@ngneat/elf-entities`・`@ngneat/elf-persist-state` を消す。
- CLAUDE.md の「`global-states/`」と「ストア（`stores/*.store.ts`）」の節を、新しい書き方で書き直す。例のコードも差し替える。
- ADR を 1 本足す（0016）。書くことは次のとおり。
  - Elf をやめたわけ。
  - SignalStore を選んだわけ。
  - toolkit の `withStorageSync` を使わなかったわけ。DB が別になること、写しが要ること、サーバーで `whenSynced()` が返らないこと（toolkit 22.0.1 の中身で確認）を書く。
  - 保存の部品を 2 つに分けたわけ。
- ADR-0015 には、保存と復元の呼び出しがストアの部品に移ったことを追記する。

## 12. 先のこと

localforage も更新が止まりかけている（npm の最新は 1.10.0、2021-08-18）。ただ、IndexedDB の薄い包みなので、すぐ困ることはない。この移行で、localforage を触る所を 6 章の下請けに閉じ込める。いずれ替えるときは、そこだけで済む。

## 13. 作り手に任せること

- `withSettingsStorage`・`withOfflineSnapshot`・`withAppDevtools`・下請けの名前・置き場所・中の書き方。
- 作業の割り方。ただし、途中のコミットでもビルドとテストが通る順にする。
- spec の書き換え方。`TestBed.inject` にそろえることだけは決まっている。
- 10 章の 5 の「同時に描く」確かめ方。

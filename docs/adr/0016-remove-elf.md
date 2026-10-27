# ADR-0016: ストアを Elf から NgRx SignalStore に移し、保存は自前の部品 2 つにする

- **日時**: 2026-10-27
- **Agent**: claude-sonnet-5-5
- **ステータス**: 採用済み
- **ブランチ**: refactor/remove-elf
- **関連**: 設計 `docs/superpowers/specs/2026-10-27-remove-elf-design.md`、ADR-0014（SSR の描き分けの決まり）、ADR-0015（圏外用の保存）

---

## 背景

- client のストアは全部 Elf（`@ngneat/elf`・`elf-entities`・`elf-persist-state`・`elf-devtools`）で作っていた。
- Elf は開発が止まった。npm の最新は 2.5.1 と persist-state 1.2.1 で、2024-02 から版が出ていない。GitHub の ngneat の組織は公開リポジトリが 0 件で、有志の読み取り専用の写し（`ngneat-archive/elf`）しか残っていない。
- 直らない弱点もあった。persist-state は、setItem が 1 回失敗すると保存が止まる。`skip(1)` のせいで、起動直後の変更も落ちる（ADR-0015 の背景）。
- ストアはファイルの中の const で、プロセスの中で使い回される。SSR は描くたびに `resetElfStores()` で中身を空にしていて、「1 プロセスが同時に描くのは 1 件」という前提に乗っていた（ADR-0014）。

## 決定

- **ストアは全部 NgRx SignalStore（`@ngrx/signals` 22.0.1）に移す。一度に全部移し、1 回のリリースで出す。** `@ngneat/elf*` の 4 つの依存と import は 0 件にした。
- **全部 `providedIn: 'root'`**。ページを離れても中身が残る今の振る舞いを守り、SSR ではリクエストごとの injector が別のインスタンスを作る。`resetElfStores()` と `app.config.server.ts` の初期化処理は消した。
- **`global-states/` の `*StateStore` と `*StateQuery` の組は 1 つの SignalStore にまとめた**（一覧は `withEntities`）。`initialize.state.ts` と、ページのファイル先頭にあった `let fetchSeq`・`firstLoading` なども、ストアの中へ移した。時間で変わる値は `withComputed`（メモ化される）でなく `withMethods` のクロージャに持つ。
- **読む側は signal にそろえた**。`xxx$` と `get xxx` はやめた。書き込みメソッドの名前は変えず、中を `patchState` にした。
- **`withDevtools`（`@ngrx-toolkit/core`）は開発ビルドだけ**。`withAppDevtools(name)` が、本番では `withDevToolsStub` に切り替える。`@angular-architects/ngrx-toolkit` は非推奨なので使わない。
- **`main.ts` と `main.server.ts` からは `enableElfProdMode()` を消した（`main.ts` の `devTools()` はそれより前、Task 5 / R5 で消している）。`localForage.config`（DB `sotetsu-lab-v3-client`、`storeName: 'elf_state'`）は残した**。利用者の端末の設定・下書き・圏外用の保存がそこに入っているので、名前を変えると読めなくなる。
- **`pageResolver` は Observable を受けない**。設定の保存を持つストアの token を渡し、その `settingsReady` が true になるのを待つ。
- **設定の見張り（`withSettingsStorage`）は、保存する項目（`fields`）の参照が変わったときだけ間引きを掛け直す（R13）**。real-time ページの毎秒の読み込み中の印（`loadingQueue`）の書き換えで掛け直しが続き、1000ms の保存が飢えたため。実地の確かめで見つかった。
- **`pageResolver` は、signal がすでに true なら `toObservable` を作らず同期で解決する**。`toObservable` は購読をやめても残る effect を作るので、遷移のたびに作らない。待つときだけ作る。
- **socket.service の `toObservable`（root の injector で `take(1)`）は、root に effect を 1 つ残す**（アプリを閉じるまで。1 回だけ）。トークンがすぐ取れないときは、次の flush の後につなぐ（同期ではつながない）。
- **`server.ts` の描画の列は 2c まで残す（R14）**。ストアは DI でリクエストごとに分かれたので、列を外しても混線しない。列を外して同時に描く確かめ（`.context/m29/ssr-concurrent.mjs`、2026-10-27）は、このブランチで通り、Elf のビルドでは同じ確かめが落ちた。それでも同時描画の可否は 2c で決めるので、それまでは保守的な守りとして置く。外すときはこの確かめを、列を外したビルドでもう一度回す。

### なぜ Elf をやめたか

上の背景のとおり、止まった依存の弱点を自分で抱え続けることになる。SSR の土台（2c）を、プロセス全体で 1 つのストアと「描くたびに空にする」前提の上に組むのも避けたかった。

### なぜ SignalStore を選んだか

- Angular の signal の上に作られ、コンポーネントが `toSignal` を挟まずに読める。全部 OnPush のこのアプリと相性が良い。
- DI のクラスなので、リクエストごと・TestBed ごとに別のインスタンスになる。SSR で同時に描いても混ざらず、spec は `TestBed.inject` で済む。
- 部品（`signalStoreFeature`）で、保存や DevTools をストアの定義に並べられる。

### なぜ toolkit の `withStorageSync` を使わなかったか

- 保存先の DB が別になる。今の端末の設定と下書きは localforage の `elf_state` にあるので、読み直すには写しが要る。さらに、古いタブが動いている間・前の版へ戻したときの扱いまで考える必要があった。
- サーバーでは `whenSynced()` が返らない（`@ngrx-toolkit` 22.0.1 の中身で確認）。`pageResolver` が設定の復元を待つので、そのままではサーバーの描画が止まりうる。
- 結局、toolkit に任せる仕事がほとんど残らない。保存の書き方（キー・形）を変えずに自前の部品で書くほうが、写しも戻し先の心配も要らない。最初は toolkit に写しを足す案を選んだが、2026-10-27 に取り消した。

### なぜ保存の部品を 2 つに分けたか

- `withSettingsStorage`（画面の設定と下書き）は、**起動したら必ず戻し**、**変わったときに書く**。拾うのは表の項目（`fields`）だけで、古い丸ごと保存が残っていても中身は戻さない。
- `withOfflineSnapshots`（取ったデータ。ADR-0015）は、**起動時には戻さず**、**取得に失敗し条件が合うときだけ戻す**。書くのは取得に成功したとき。形には版と条件が付く。
- 戻す時機・書く時機・形が逆なので、1 つの部品に旗で混ぜない。共通の部分（localforage の読み書き・サーバーでは何もしない・失敗は握りつぶす）は下請けの `DeviceStorage`（`core/storage/device-storage.ts`）にまとめた。localforage を import する非 spec のファイルは、これと `main.ts` だけになる。

## 退けた案

- **toolkit の `withStorageSync`・`withIndexedDB`**: 上のとおり。
- **ストアをファイルの中の const のまま、Elf だけ別の道具に替える**: SSR のリクエスト間の混線が残る。
- **localforage を `idb-keyval` などに替える**: 今回はしない。localforage に触る所を `DeviceStorage` に閉じ込めたので、いずれ替えるときはそこだけで済む。

## 結果

- `@ngneat/elf*` の依存と import は 0 件。部品は `core/store-features/`（`withSettingsStorage`・`withOfflineSnapshots`・`withAppDevtools`）にある。
- 新しいストアは CLAUDE.md の「ストア」の節の形で書く。
- 保存のキーと形は今までと同じなので、端末の設定と圏外用の保存は、更新後もそのまま読める。前の版へ戻しても読める。
- 残る作業：localforage も更新が止まりかけている（npm の最新は 1.10.0、2021-08-18）。困ったら `DeviceStorage` の中だけを替える。

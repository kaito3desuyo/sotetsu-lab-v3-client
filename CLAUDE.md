# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## コマンド

```bash
# 開発サーバー (http://localhost:4200)
# ※ /api プロキシは host.docker.internal:3011 向け。Docker 外で起動する場合は src/proxy.conf.json を調整すること
npm run dev

# ビルド
npm run build:prod   # 本番
npm run build:dev    # 開発（ソースマップあり、最適化なし）

# テスト
npm test                                          # Jest 全テスト
npx jest --testPathPatterns=src/path/to/spec.ts  # 単一テストファイル（jest 30 で複数形になった）

# Lint
npm run lint

# E2E
npm run cypress:open   # インタラクティブ
npm run cypress:run    # ヘッドレス
```

## アーキテクチャ

Angular 22 SPA。SSR 設定は存在するが無効（`ssr: false`）。バックエンドは `environment.apiUrl` で指定された別サービス。

### `src/app/` 配下のレイヤー構成

```
libs/           ← ドメインデータ層（12ドメイン）
global-states/  ← アプリ全体で共有するグローバル状態
pages/          ← 機能ページ（遅延ロード）
shared/         ← 複数ページで再利用するコンポーネント
core/           ← フレームワーク基盤（インターセプター・ガード・リゾルバー・複数ページで使うパイプ等）
layout/         ← シェルレイアウトコンポーネント
```

### `libs/<domain>/`（例: `libs/operation/`）

外部からは `usecase/` のみを参照する。

- `usecase/` — ドメインの公開 API。`*.service.ts` ファサード、DTO（`dtos/`）、ビルダー、ドメインの enum・定数（`enums/`・`constants/`）を提供する。
- `infrastructure/` — HTTP 実装。`queries/` が `HttpClient` 呼び出しを保持し、`models/` が API レスポンス型、`builders/` がモデル → DTO 変換を担う。class-transformer は使わない。DTO・Model は interface で、builder が `id` ↔ `xxxId` を手で付け替える（ADR-0006）。

ページコードは `infrastructure/` を直接インポートしてはならない。

### `global-states/`

アプリ全体で共有する NgRx SignalStore（`@ngrx/signals`）。1 ファイルが `*State` を 1 つ `signalStore({ providedIn: 'root' }, ...)` でエクスポートし、読み書きの両方をそこに持つ（`*StateStore` と `*StateQuery` の組は無い）。一覧は `withEntities` で持ち、他のストアを読む computed は `withComputed` の中で `inject` して組む。取得は `fetch()`（Observable）で行い、`initialDataResolver` がルート遷移時に一度だけ呼ぶ。`initialize.state.ts`（`InitializeState`）も同じ形で、`pageResolver` が初期化の完了を待つ。

---

## 標準ページ構成パターン

新規ページを実装する際は以下の構成に従うこと。既存のページと `shared/` の部品は、すべてこの構成にそろえてある（旧構成の `states/`・`-c`/`-p` 分割・`*-resolver.service.ts` は 2026-10-08 に無くした。ADR-0004）。

### ファイル構成

```
pages/<feature>/
  <feature>.component.ts      ← ルートコンポーネント（ローディング管理・イベント購読）
  <feature>.route.ts          ← resolve に core/resolvers/page.resolver.ts の pageResolver(...)
  stores/<feature>.store.ts   ← SignalStore（データ + UI 状態をまとめて保持）
  services/<feature>.service.ts
  components/
    <feature>-<widget>/       ← 単一コンポーネント（-c/-p への分割は行わない）
  pipes/, enums/, interfaces/, utils/
```

### ストア（`stores/*.store.ts`）

`signalStore({ providedIn: 'root' }, ...)` でクラスとしてエクスポートし、使う側は `inject(FooStore)` で受ける（`@Injectable` を自分で書かない）。データと UI フラグの両方をここで管理する（`states/` は作らない）。`providedIn: 'root'` なので、ページを離れても中身が残り、SSR ではリクエストごとに別のインスタンスになる。ファイルの先頭に変わる値（`let` や `signal`）を置かない。

書き方（共通の手順）:

- **読む**: Observable の `xxx$` や `get xxx` は無い。`store.xxx()` と signal で読む。RxJS の流れの中で要るときだけ `toObservable` を使う。
- **書く**: 書き込みメソッドは `withMethods` に置き、中は `patchState`。ストアの中身を spec から直接書くときは `@ngrx/signals/testing` の `unprotected` を使う（`protectedState` は既定の true のまま）。
- **時間で変わる値を `withComputed` に入れない**: computed はメモ化される。取得の世代番号（`fetchSeq`）は `withMethods` の中のクロージャ変数に持ち、`nextFetchSeq()` と `isLatestFetch(seq)` で出す。
- **読み込み中の印の掃除**: 新しいページには要らない。既存の 9 ページの `withHooks({ onInit })` にある `resetLoading()` は、旧版のファイル先頭の呼び出しを引き継いだもの。`onInit` はストアを作ったときの 1 回だけで、`withSettingsStorage` は `fields` 以外を戻さないため、今は空の `loadingQueue` を空にするだけ（チャンク再入時の守りではない）。
- **画面の設定と下書きの保存**: `withSettingsStorage({ key, fields, debounceMs })`（`core/store-features/`）。起動時に `fields` だけを戻し、変わったときだけ書く。読み込みが済むと `settingsReady` が true になり、保存を持つページの route は `pageResolver(FooStore)` でそれを待つ。
- **取ったデータの保存（圏外用）**: `withOfflineSnapshots({ main: { key, select, apply } })`（ADR-0015）。ストアに `saveOfflineSnapshot(name, conditions)` と `restoreOfflineSnapshot(name, conditions)` が付く。取得に成功したら save、失敗したら restore を、コンポーネントが呼ぶ。ストアの定義を見れば何を保存しているか分かる。`select`・`apply` が他のメソッドを呼ぶので `withFeature` で包む。
- **DevTools**: `withAppDevtools('FooStore')`（開発ビルドだけ Redux DevTools に繋がる）。
- **spec**: `TestBed.inject(FooStore)`。TestBed ごとに別のストアなので、afterEach で中身を戻さない。

```ts
export const FooStore = signalStore(
  { providedIn: 'root' },
  withState<StoreProps>(initialState),
  withComputed(({ loadingQueue }) => ({
    isLoading: computed(() => loadingQueue().length > 0),
  })),
  withMethods((store) => {
    let fetchSeq = 0; // 時間で変わる値は computed でなくクロージャに持つ
    return {
      nextFetchSeq: (): number => ++fetchSeq,
      isLatestFetch: (seq: number): boolean => seq === fetchSeq,
      setBar(bar: Bar): void { patchState(store, { bar }); },
      enableLoading(): void {
        patchState(store, (s) => ({ loadingQueue: s.loadingQueue.concat(true) }));
      },
      disableLoading(): void {
        patchState(store, (s) => ({ loadingQueue: s.loadingQueue.slice(1) }));
      },
      resetLoading(): void { patchState(store, { loadingQueue: [] }); },
      snapshot(): FooSnapshot { return { bar: store.bar() }; },
      restoreSnapshot(data: FooSnapshot): void { patchState(store, { bar: data.bar }); },
    };
  }),
  withSettingsStorage<StoreProps>({ key: 'FooStore', fields: ['selectedIds'] }),
  withFeature((store) =>
    withOfflineSnapshots({
      main: {
        key: 'Foo',
        select: () => store.snapshot(),
        apply: (data: FooSnapshot) => store.restoreSnapshot(data),
      },
    }),
  ),
  withAppDevtools('FooStore'),
);
```

設定を保存しないページは `withSettingsStorage` を、圏外用の保存をしないページは `withOfflineSnapshots` を省く。localforage に触るのは `core/storage/device-storage.ts`（`DeviceStorage`）と `main.ts` の `localForage.config` だけにする（`storeName: 'elf_state'` は保存済みのデータの置き場なので変えない。ADR-0016）。

### サービス（`services/*.service.ts`）

`@Injectable()` で宣言し、`libs/` のサービスからデータを取得してストアへ書き込む。

### コンポーネント

- すべて `ChangeDetectionStrategy.OnPush`
- すべて `imports: [...]` 形式のスタンドアロンコンポーネント
- フィールド注入は `inject()` 関数を使い、private には `#` プレフィックスを付ける
- ストアは `readonly #store = inject(FooStore)` で受け、`this.#store.bar()` と signal で読む。Observable → Signal 変換が要るもの（HTTP の結果など）は `toSignal()` を使う
- 複数ページに置く `shared/` のカード（検索・投稿）は、表示中の値をページから `input` で受け、ボタンの遷移はカード自身が `Router` で行う（Subject のイベントサービスは作らない。遷移失敗の通知は `core/utils/notify-navigation-failure.ts`）

### ルートコンポーネントのデータ取得

順次フェッチが必要な場合は `async/await + lastValueFrom()` を使う。

```ts
async fetchData(): Promise<void> {
  this.#store.enableLoading();
  await lastValueFrom(this.#fooService.fetchA());
  await lastValueFrom(this.#fooService.fetchB());
  this.#store.disableLoading();
}
```

---

## スタイリング

- **Tailwind** クラスには必ず `tw-` プレフィックスを付ける（例: `tw-flex`, `tw-text-sm`）
- `preflight` は無効。Angular Material（`mat-`）がベーススタイルを担う
- カスタムカラートークン `primary` / `accent` は `tailwind.config.js` で定義済み

## HTTP / 認証

`AuthInterceptor` が `x-sotetsu-lab-authorization` ヘッダーを付与する。API エンドポイントは `/v3/` を使用する（v2 は全て移行済み）。インフラクエリは `HttpParams` でクエリパラメータを構築し、`core/query-cache/query-cache.ts` の `QueryCache`（`md5` のキー + `shareReplay`）でキャッシュする。`forceReload: true` でそのキーを作り直す。`maxAgeMs` を渡すと、届いてからその長さを過ぎた値を取り直す（token・profile・maintenance をガードと resolver が 5 秒だけ使い回す。docs/adr/0007）。書き込みが成功したら、libs の usecase service が `QueryInvalidator.invalidate('timetable' | 'sighting')` を呼び、関係する query がキャッシュを捨てる。tag の付く取得は `cache: QueryInvalidator.requestCache(tag)` を渡す。列車情報を書いた後の 1 時間は、時刻表系の GET が `cache: 'reload'` になる（API の `private, max-age=3600` と対。目撃は `no-store` なので窓 0。docs/adr/0002）。

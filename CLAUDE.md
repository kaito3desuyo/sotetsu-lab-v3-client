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
npx jest --testPathPattern=src/path/to/spec.ts   # 単一テストファイル

# Lint
npm run lint

# E2E
npm run cypress:open   # インタラクティブ
npm run cypress:run    # ヘッドレス
```

## アーキテクチャ

Angular 20 SPA。SSR 設定は存在するが無効（`ssr: false`）。バックエンドは `environment.apiUrl` で指定された別サービス。

### `src/app/` 配下のレイヤー構成

```
libs/           ← ドメインデータ層（12ドメイン）
global-states/  ← アプリ全体で共有するグローバル状態
pages/          ← 機能ページ（遅延ロード）
shared/         ← 複数ページで再利用するコンポーネント
core/           ← フレームワーク基盤（インターセプター・ガード・リゾルバー等）
layout/         ← シェルレイアウトコンポーネント
```

### `libs/<domain>/`（例: `libs/operation/`）

外部からは `usecase/` のみを参照する。

- `usecase/` — ドメインの公開 API。`*.service.ts` ファサード、DTO（`dtos/`）、ビルダーを提供する。
- `infrastructure/` — HTTP 実装。`queries/` が `HttpClient` 呼び出しを保持し、`models/` が API レスポンス型、`builders/` がモデル → DTO 変換を担う。

ページコードは `infrastructure/` を直接インポートしてはならない。

### `global-states/`

アプリ全体の Elf エンティティストア。各ファイルが `*StateStore`（書き込み用 `@Injectable`）と `*StateQuery`（読み取り用 `@Injectable`）ペアをエクスポートする。`initialDataResolver` がルート遷移時に一度だけフェッチする。

---

## 標準ページ構成パターン

新規ページを実装する際は以下の構成に従うこと。`dashboard/`・`timetable-*/`・`operation-table/` など多くの既存ページは移行前の古い構成（`states/`、`-c`/`-p` コンポーネント分割）を使っているため、それらを参考にしてはならない。

### ファイル構成

```
pages/<feature>/
  <feature>.component.ts      ← ルートコンポーネント（ローディング管理・イベント購読）
  <feature>.route.ts
  stores/<feature>.store.ts   ← Elf ストア（plain const object、データ + UI 状態をまとめて保持）
  services/<feature>.service.ts
  services/<feature>-resolver.service.ts
  components/
    <feature>-<widget>/       ← 単一コンポーネント（-c/-p への分割は行わない）
  pipes/, enums/, interfaces/, utils/
```

### ストア（`stores/*.store.ts`）

`@Injectable` ではなく `const` オブジェクトとしてエクスポートし、`@ngneat/elf` の `createStore` を直接使う。データと UI フラグの両方をここで管理する（`states/` は作らない）。`core/utils/elf-store.ts` の `createElfStore()` は旧 `states/` パターン用のラッパーであり、新規コードでは使わない。メソッドと `$` サフィックスの Observable、`get` アクセサをすべて同一オブジェクトにまとめる。永続化が必要な場合は `@ngneat/elf-persist-state` + `localforage` を使う。

```ts
const store = createStore({ name: 'FooStore' }, withProps<StoreProps>({ ... }));

export const FooStore = {
  // 書き込みメソッド
  setBar(bar: Bar): void { store.update(setProp('bar', () => bar)); },
  enableLoading(): void { store.update(setProp('loadingQueue', (s) => s.concat(true))); },
  disableLoading(): void { store.update(setProp('loadingQueue', (s) => s.slice(1))); },

  // Observable（$ サフィックス）
  bar$: store.pipe(select((s) => s.bar)),
  isLoading$: store.pipe(select((s) => s.loadingQueue.length > 0)),

  // 同期アクセサ
  get bar(): Bar { return store.getValue().bar; },
} as const;
```

### サービス（`services/*.service.ts`）

`@Injectable()` で宣言し、`libs/` のサービスからデータを取得してストアへ書き込む。

### コンポーネント

- すべて `ChangeDetectionStrategy.OnPush`
- すべて `imports: [...]` 形式のスタンドアロンコンポーネント
- フィールド注入は `inject()` 関数を使い、private には `#` プレフィックスを付ける
- Observable → Signal 変換は `toSignal()` を使う

### ルートコンポーネントのデータ取得

順次フェッチが必要な場合は `async/await + lastValueFrom()` を使う。

```ts
async fetchData(): Promise<void> {
  FooStore.enableLoading();
  await lastValueFrom(this.#fooService.fetchA());
  await lastValueFrom(this.#fooService.fetchB());
  FooStore.disableLoading();
}
```

---

## スタイリング

- **Tailwind** クラスには必ず `tw-` プレフィックスを付ける（例: `tw-flex`, `tw-text-sm`）
- `preflight` は無効。Angular Material（`mat-`）がベーススタイルを担う
- カスタムカラートークン `primary` / `accent` は `tailwind.config.js` で定義済み

## HTTP / 認証

`AuthInterceptor` が `x-sotetsu-lab-authorization` ヘッダーを付与する。API エンドポイントは `/v3/` を使用する（v2 は全て移行済み）。インフラクエリは `HttpParams` でクエリパラメータを構築し、`md5(JSON.stringify(params))` をキーに `shareReplay` でキャッシュし、`forceReload: true` でキャッシュを破棄できる。

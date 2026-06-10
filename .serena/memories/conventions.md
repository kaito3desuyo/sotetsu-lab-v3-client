# Conventions

## コンポーネント
- すべて `ChangeDetectionStrategy.OnPush` + スタンドアロン（`imports: [...]`）
- DI は `inject()` 関数のみ。private フィールドは `#` プレフィックス
- Observable → Signal 変換は `toSignal()` を使う

## ストア（新規ページ標準パターン）
- `@Injectable` **ではなく** `const` オブジェクトとしてエクスポートする
- `@ngneat/elf` の `createStore()` を直接使う（`core/utils/elf-store.ts` の `createElfStore()` は旧パターン用、新規コードでは使わない）
- データと UI フラグ（loadingQueue など）を同一オブジェクトにまとめる
- メソッド（書き込み）、`$` サフィックスの Observable、`get` アクセサをすべて同一オブジェクトに

```ts
const store = createStore({ name: 'FooStore' }, withProps<StoreProps>({ ... }));
export const FooStore = {
  setBar(bar: Bar): void { store.update(setProp('bar', () => bar)); },
  enableLoading(): void { store.update(setProp('loadingQueue', (s) => s.concat(true))); },
  disableLoading(): void { store.update(setProp('loadingQueue', (s) => s.slice(1))); },
  bar$: store.pipe(select((s) => s.bar)),
  isLoading$: store.pipe(select((s) => s.loadingQueue.length > 0)),
  get bar(): Bar { return store.getValue().bar; },
} as const;
```

## ページ構成（新規標準）
```
pages/<feature>/
  <feature>.component.ts     ← ローディング管理・イベント購読
  <feature>.route.ts
  stores/<feature>.store.ts
  services/<feature>.service.ts
  services/<feature>-resolver.service.ts
  components/<feature>-<widget>/   ← -c/-p分割しない
  pipes/, enums/, interfaces/, utils/
```

**参考にしてはならない旧パターン**: `dashboard/`, `timetable-*/`, `operation-table/` — `states/` ディレクトリ, `-c`/`-p` コンポーネント分割を使用している。

## データ取得（ルートコンポーネント）
順次フェッチが必要な場合は `async/await + lastValueFrom()`:
```ts
async fetchData(): Promise<void> {
  FooStore.enableLoading();
  await lastValueFrom(this.#fooService.fetchA());
  await lastValueFrom(this.#fooService.fetchB());
  FooStore.disableLoading();
}
```

## HTTP / 認証
- `AuthInterceptor` が `x-sotetsu-lab-authorization` ヘッダーを付与
- APIエンドポイント: `/v2/` と `/v3/` の2バージョン。新規メソッドは `/v3/`
- クエリ文字列: `RequestQueryBuilder`（`@nestjsx/crud-request`）で構築
- インフラクエリキャッシュ: `md5(JSON.stringify(params))` をキーに `shareReplay`。`forceReload: true` でキャッシュ破棄

## スタイリング
- Tailwind クラスには必ず `tw-` プレフィックス（例: `tw-flex`, `tw-text-sm`）
- preflight 無効。Angular Material がベーススタイル担当
- カスタムカラートークン `primary`/`accent` は `tailwind.config.js` で定義済み

## その他
- `libs/` の `_V3` サフィックスメソッド: v2 と共存するための命名。v2版削除後はサフィックス除去可（他ページの v2 版参照を `grep` で確認してから）

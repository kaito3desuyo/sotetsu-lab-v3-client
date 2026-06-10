# Tech Stack

## 言語・ランタイム
- TypeScript 5.8.x（`strict: false`, `experimentalDecorators: true`, `moduleResolution: bundler`）
- Node.js 22.17.0（Volta ピン）

## フレームワーク・ライブラリ
- Angular 20.x（スタンドアロンコンポーネント、`inject()` 関数注入）
- Angular Material 20.x（ベーススタイル担当、preflight 無効）
- RxJS 7.8.x
- `@ngneat/elf` 2.5.x — 状態管理。`createStore` + `withProps` パターン
- `@ngneat/elf-persist-state` 1.2.x + `localforage` — 永続化ストア
- `@ngneat/elf-entities` 5.0.x — エンティティストア（global-states で使用）
- `@rx-angular/state` 20.x / `@rx-angular/cdk` 20.x
- Tailwind CSS 3.4.x（`tw-` プレフィックス必須、preflight 無効）
- `@nestjsx/crud-request` 4.6.x — APIクエリ文字列ビルダー（RequestQueryBuilder）
- `date-fns` 3.x / `date-fns-tz` 3.x / `dayjs` 1.11.x
- `js-md5` 0.8.x — インフラクエリキャッシュキー生成に使用
- `es-toolkit` 1.26.x、`lodash-es` 4.17.x

## ビルド・テスト・Lint
- Angular CLI 20.x (`ng`)
- Jest 29.x + `@angular-builders/jest` 20.x（単体テスト）
- Cypress 13.x（E2E）
- ESLint 9.x + `@angular-eslint` / `@typescript-eslint` 8.x
- Prettier 3.x + `prettier-plugin-tailwindcss`
- パッケージマネージャー: npm（`package-lock.json`）

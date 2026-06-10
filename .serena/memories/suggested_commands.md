# Suggested Commands

## 開発
```bash
npm run dev          # 開発サーバー http://localhost:4200 (--host 0.0.0.0)
                     # /api プロキシは host.docker.internal:3011 向け
                     # Docker外で起動する場合は src/proxy.conf.json を調整すること
```

## ビルド
```bash
npm run build:prod   # 本番ビルド
npm run build:dev    # 開発ビルド（ソースマップあり、最適化なし）
```

## テスト
```bash
npm test                                          # Jest 全テスト
npx jest --testPathPattern=src/path/to/spec.ts   # 単一テストファイル
npm run cypress:open   # E2E インタラクティブ
npm run cypress:run    # E2E ヘッドレス
```

## Lint / フォーマット
```bash
npm run lint   # ESLint（angular-eslint + typescript-eslint）
               # Prettierは別途 npx prettier --write . で実行
```

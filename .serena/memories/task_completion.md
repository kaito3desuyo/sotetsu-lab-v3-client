# Task Completion Checklist

コーディングタスクを完了とみなす前に以下を実行する。

```bash
# 1. Lint（ESLint）
npm run lint

# 2. 単体テスト
npm test

# 3. 型チェック（Angular コンパイラ込み）
npx ng build --dry-run   # またはビルドが通ることを確認
```

- E2E（Cypress）は機能変更を伴うタスクでのみ実行
- UI変更を伴う場合は開発サーバー（`npm run dev`）で実際に動作確認すること

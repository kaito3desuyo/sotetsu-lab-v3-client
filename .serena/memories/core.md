# Core — sotetsu-lab-v3-client

Angular 20 SPA（鉄道運行情報ビューア）。SSR設定あり、`ssr: false` で無効。

## src/app/ レイヤー

- `libs/<domain>/` — ドメインデータ層（13ドメイン）。外部から参照可能なのは `usecase/` のみ。`infrastructure/` は直接インポート禁止。
  - ドメイン: auth / calendar / formation / service / agency / operation / route / user / operation-sighting / trip-block / trip-class / trip / station
- `global-states/` — Elf エンティティストア群。`*StateStore` + `*StateQuery` ペアをエクスポート。`initialDataResolver` がルート遷移時に1回フェッチ。
- `pages/` — 遅延ロードの機能ページ（dashboard / timetable / operation / library / maintenance）
- `shared/` — 複数ページで再利用するコンポーネント
- `core/` — インターセプター（AuthInterceptor, PayloadHashInterceptor）・ガード・リゾルバー・ユーティリティ
- `layout/` — シェルレイアウトコンポーネント

## libs/<domain>/ 内部構成

```
usecase/          ← 公開API。*.service.ts ファサード, DTOs (dtos/), builders
infrastructure/   ← 非公開。queries/ (HttpClient), models/ (APIレスポンス型), builders/ (model→DTO変換)
```

## 関連メモリ

- コード規約・パターン: `mem:conventions`
- ビルド/テスト/lint コマンド: `mem:suggested_commands`
- タスク完了時のチェックリスト: `mem:task_completion`

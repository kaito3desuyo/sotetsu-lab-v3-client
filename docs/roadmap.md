# ロードマップ（client）

2026-10-23 に棚卸しした、次のマイルストーンのうち client が関わる分。各マイルストーンの spec・計画・ADR は着手時に `docs/superpowers/` と `docs/adr/` に書く。

## 全体の順番

M0 後始末 → M1 登録制 ② → M2 SSR → M3 臨時列車 → M4 API の外部公開。M5 過去の目撃データの補完（段1：解析）は M1 と並行。性能と費用削減も並行で進めるが、手をつける前に計測する。他のリポジトリの分は、それぞれの `docs/roadmap.md` にある。

## client の分

| # | 名前 | client でやること | 着手前に決める・確かめること |
|---|---|---|---|
| M1 | 登録制 ② | ログイン・新規登録をページ（`/login`・`/register`、`return_to` で戻る）にしてダイアログは廃止、ゲストへの「ログインが必要です」の案内（フィーチャーフラグ on のときだけ）、socket の合図を `{type}` で受ける、時刻表の入力を編集者だけに出す | 決定・実装済み（2026-10-23・`docs/superpowers/specs/2026-10-23-registered-only-posting-design.md`・ADR-0011・PR #271） |
| M2 | SSR | 古くならないページだけを描いて CDN に 1 時間置く | Lambda＋osls か Web Functions かは計画で比べる。spec は `feature/ssr` |
| M3 | 臨時列車 | 臨時ダイヤの◆表示、運用の割り当て変更の画面 | M2 の後（行程表 → SSR → 臨時ダイヤの順） |
| M4 | API の外部公開 | 同意ページ（`/oauth/consent?authorization_id=…`）、client_id/secret の発行画面 | M1 の `/login` が要る。ゲストは同意ページから `/login` に送る |
| 並行 | 性能 | 運用表の trips 3.5MB、全線時刻表の並べ替え（`timetable-all-line/utils/sort-trips.util.ts`）を api の並び順テーブルに移す | 作る前に計測する |

# ロードマップ（client）

2026-10-23 に棚卸しした、次のマイルストーンのうち client が関わる分。各マイルストーンの spec・計画・ADR は着手時に `docs/superpowers/` と `docs/adr/` に書く。

## 全体の順番

M0 後始末 → M1 登録制 ② → M2 SSR → M3 臨時列車 → M4 API の外部公開。M5 過去の目撃データの補完（段1：解析）は M1 と並行。M8 index.html のキャッシュは M1 の告知日より前に。M9 依存の脆弱性はいつでも差し込める。性能と費用削減も並行で進めるが、手をつける前に計測する。他のリポジトリの分は、それぞれの `docs/roadmap.md` にある。

## client の分

| # | 名前 | client でやること | 着手前に決める・確かめること |
|---|---|---|---|
| M1 | 登録制 ② | ログイン・新規登録をページ（`/login`・`/register`、`return_to` で戻る）にしてダイアログは廃止、ゲストへの「ログインが必要です」の案内（フィーチャーフラグ on のときだけ）、socket の合図を `{type}` で受ける、時刻表の入力を編集者だけに出す | 決定・実装済み（2026-10-23・`docs/superpowers/specs/2026-10-23-registered-only-posting-design.md`・ADR-0011・PR #271） |
| M2 | SSR | 古くならないページだけを描いて CDN に 1 時間置く | Lambda＋osls か Web Functions かは計画で比べる。spec は `feature/ssr` |
| M3 | 臨時列車 | 臨時ダイヤの◆表示、運用の割り当て変更の画面 | M2 の後（行程表 → SSR → 臨時ダイヤの順） |
| M4 | API の外部公開 | 同意ページ（`/oauth/consent?authorization_id=…`）、client_id/secret の発行画面 | M1 の `/login` が要る。ゲストは同意ページから `/login` に送る |
| M8 | index.html のキャッシュ | デプロイ（`.github/workflows/deploy-on-push-version-tags.yml`）が全ファイルに `max-age=31536000` を付けているので、Service Worker の無いブラウザは古い index.html（と `ngsw.json` など）を最大 1 年使い続ける。index.html・`ngsw*.json`・`manifest` などは `no-cache` にし、ハッシュ付きの chunk だけ 1 年にする | 2026-10-23 の v2.17.0 確認で見つけた（`?nocache=1` で回避した）。CloudFront にも index.html が残るので、デプロイ時の invalidation の有無も確かめる。M1 の告知日より前に出す |
| M9 | 依存の脆弱性 | Dependabot の警告 5 件（high 1・moderate 4、2026-10-24 時点）を直す。api の M9 と同じ扱い | まず中身を見て、本番のブラウザに届く依存か（開発・ビルドだけの依存か）で直す順を決める |
| 並行 | 性能 | 運用表の trips 3.5MB、全線時刻表の並べ替え（`timetable-all-line/utils/sort-trips.util.ts`）を api の並び順テーブルに移す | 作る前に計測する |

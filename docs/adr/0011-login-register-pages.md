# ADR-0011: ログインと新規登録をダイアログからページに移し、ゲストには投稿の代わりに案内を出す

- **日時**: 2026-10-23
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み
- **ブランチ**: feature/registered-only-posting
- **関連**: ADR-0009（Supabase Auth への移行）。設計は `docs/superpowers/specs/2026-10-23-registered-only-posting-design.md`、全体は api リポの `docs/superpowers/specs/2026-10-23-registered-only-posting-design.md`

---

## 背景

- 目撃の投稿を登録者だけにする（ロードマップ M1）。ゲストには投稿の口で案内を出し、ログインか新規登録に進んでもらう必要がある。
- ログインと新規登録は、ヘッダーから開くダイアログだった。ダイアログには URL が無いので、M4 の同意ページなど外の画面から同じ入口に送れない。
- socket の合図は、api が `{"type": …}` の形で出すようになる。client は中身を見ずに目撃のキャッシュを捨て、投稿の後には自分から `sendSighting` を送っていた。

## 決定

- ログインと新規登録をページ（`/login`・`/register`）にし、`LoginDialogComponent`・`RegisterDialogComponent` は消す。URL を持つので、M4 の同意ページからも同じ入口に送れる。
- 成功したら `return_to` のクエリで元の画面に戻る。ログインと登録のページは互いにリンクし、`return_to` を引き継ぐ。ヘッダーの「ログイン」「新規登録」は、今いる URL を `return_to` に付けて飛ばす。
- `return_to` は `safeReturnTo`（`core/utils/return-to.ts`）を通して、サイト内の相対パスだけを受け付ける。`/` で始まらないもの、`//`・`/\` で始まるもの（ブラウザが外のホストとして扱う）はオープンリダイレクトになるので `/` に戻す。`/login`・`/register` 自身も、戻るとループするので `/` に戻す。値は Router の遷移にだけ使い、`location.href` などには渡さない。
- ゲストには、`operation-post-form` が入力欄の代わりに「目撃の投稿にはログインが必要です」とログイン・新規登録のボタンを出す。`return_to` は今の画面。real-time の FAB はゲストにも出す。ダッシュボードの投稿カードも同じ部品なので、同じ案内になる。
- socket の合図は `{type}` で読み、`sighting` なら目撃、`timetable` なら時刻表の画面内キャッシュを捨てる。それ以外は無視する。client は投稿に成功しても `sendSighting` を送らない（合図は api が出す）。
- invalidate / restore の DTO は `userId` を送らない（api が JWT から取る）。real-time は socket の合図 `sighting` と `timetable` の両方で取り直し、それ以外は無視する。
- 投稿で 403 が返ったら（役割を外されたときなど）、「投稿する権限がありません」と出す。

実装中に決めたこと。

- `/login` と `/register` も、ほかのページと同じく `initialDataResolver` を通す。直接開いたときにも利用者の状態を分かった上で描くため。
- 投稿ダイアログは、`NavigationStart` で自分で閉じる。CDK の `closeOnNavigation` は `popstate`（戻る・進む）にしか反応せず、ダイアログ内のログインのボタンで `/login` に移ってもダイアログが開いたまま残るため。

## 影響

- ログインと登録の入口が URL になり、どの画面からも `return_to` 付きで送れる。ダイアログ 2 つとその spec は無くなる。
- ゲストでも real-time に投稿の口（FAB）が出るので、押すと案内が出る。ダッシュボードの投稿カードも同様。
- 出す順は api → client → socket。socket が `sendSighting` を消す前に client を出す（client はもう送らない）。

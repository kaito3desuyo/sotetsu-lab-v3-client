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
- 時刻表の入力（ダッシュボードの「時刻表を投稿する」・`timetable/add`・コピー・更新・全線時刻表の編集・コピー・削除・グループの操作）は編集者・管理者（`editor`・`manager`）だけに出す。api が trip-blocks の書き込みを EDITOR・MANAGER に限ったため（api ADR-0009）。ゲストにはログインと新規登録の案内を、報告者には案内だけを出す。入力ページは `timetableEditGuard` で守り、ゲストは `/login` に `return_to` 付きで送り、権限の無い登録者はトップに戻す。役割の判定は `UserStateQuery.canEditTimetable` の 1 箇所に置く。実装中（2026-10-23）にユーザーが決めた。

実装中に決めたこと。

- `/login` と `/register` も、ほかのページと同じく `initialDataResolver` を通す。直接開いたときにも利用者の状態を分かった上で描くため。
- 投稿ダイアログは、`NavigationStart` で自分で閉じる。CDK の `closeOnNavigation` は `popstate`（戻る・進む）にしか反応せず、ダイアログ内のログインのボタンで `/login` に移ってもダイアログが開いたまま残るため。

## 影響

- ログインと登録の入口が URL になり、どの画面からも `return_to` 付きで送れる。ダイアログ 2 つとその spec は無くなる。
- ゲストでも real-time に投稿の口（FAB）が出るので、押すと案内が出る。ダッシュボードの投稿カードも同様。
- 出す順は api → client → socket。socket が `sendSighting` を消す前に client を出す（client はもう送らない）。

## 追記: 公開の切り替え（フィーチャーフラグ・2026-10-23）

- 2026-10-23 にユーザーが決めた。コードは先に出しておき、告知した日に DB のフラグ `registered_only_posting` を on にして登録制を始める。
- フラグで切り替えるのは、ゲストへの案内（`operation-post-form` の「目撃の投稿にはログインが必要です」）だけ。フラグが off ならゲストにも従来どおりフォームを出す。api もフラグが off の間はゲストの投稿を通す。
- フラグの外（常に有効）: ログイン・登録のページ、socket の合図、403 の文言（「投稿する権限がありません」）、無効化・復元で `userId` を送らないこと、時刻表の入力の出し分け。
- 取得: `GET /v3/feature-flags`（`{ "registered_only_posting": true }` の形）を `libs/feature-flag` で読み、global state の `FeatureFlagState` に置く。`initialDataResolver` の 2 つ目の `Promise.all` で取り、QueryCache の `maxAgeMs` は 60 秒。
- 取れなかったとき・キーが無いときは off として扱う。on の後でも api が 403 を返せば「投稿する権限がありません」が出る。
- 切り替えの反映: api も 60 秒覚えるので、DB で on にしてから画面に効くまで最大 2 分。本番は off のまま出し、切り替えで 2 分以内に案内が替わること、off に戻せることを確かめる。

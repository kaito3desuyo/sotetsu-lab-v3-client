# ADR-0020: 投稿管理（M18）の画面 — トップレベルの `moderation/`、CSR、役割で出し分け

- **日時**: 2026-11-03
- **Agent**: claude-sonnet-5-5
- **ステータス**: 採用済み（本番へのデプロイ前。見た目の確かめが残る）
- **ブランチ**: feature/moderation
- **関連**: spec `docs/superpowers/specs/2026-11-03-moderation-design.md`、api の ADR-0013（口・役割・BAN・手がかり・まとめての無効化の決定はそちら。ここでは繰り返さない）、ADR-0011（ログイン・新規登録のページ、フラグとゲストへの投稿の案内）、ADR-0009（Supabase Auth。BAN 直後も JWT が `reporter` のままになる話）、ADR-0014（SSR の描き分け）、ADR-0019（操作帯）

---

## 背景

- 2026-11-01〜02 のゲストの荒らしを、EDITOR 1 人が 1 件ずつ無効にして片付けた（api の ADR-0013 の背景）。一人の投稿をまとめて無効にし、MANAGER が BAN でき、同じ手がかりの別アカウントを見つけられる画面が要る。
- 入口は 2 つ。新しい「投稿管理」の一覧と、過去の運用表で目撃のセルを押したときのメニュー（ユーザー判断）。
- api に `/v3/moderation` の口ができた（EDITOR・MANAGER の読み取りと無効化、MANAGER だけの BAN・解除・手がかり）。役割は `reporter`・`editor`・`manager` に `viewer`（BAN 済み）が加わった。

## 決定

### ページの置き場とルート

- **トップレベルの `pages/moderation/` に置く。** `train-diagram`・`train-location` と同じく、ルートもディレクトリも対称にする。
  - `/moderation` — 新着の一覧（`moderation-recent/`）。投稿者つきで新しい順に出し、「登録して間もない」（`newAccount`）と「短い時間に何件も」（`burst`）の印を付ける。
  - `/moderation/users/:userId` — 投稿者のページ（`moderation-user/`）。
- 投稿者のページの部品は `moderation-user/components/` に置く（確認のダイアログ `moderation-confirm-dialog`）。ストア・サービスは他のページと同じ形（CLAUDE.md の標準ページ構成）。
- API を包む `libs/moderation/` を足した。ページは `usecase/` の `ModerationService` だけを見る。
- サイドナビの「管理」の節に「投稿管理」を足す。`canModerate()` が真のときだけ出す。

### SSR では描かない（CSR・NO_STORE）

- `app.routes.server.ts` に `moderation` と `moderation/**` を `RenderMode.Client`＋`NO_STORE` で足した。ログインが要り、投稿者の名前など個人情報を含むので、サーバーで描かず CDN にも置かない（api の応答も保存させない）。

### ガード

- `moderationGuard`（`core/guards/moderation.guard.ts`）を、`maintenanceGuard` と並べて `moderation` のルートに掛ける。形は `timetable-edit.guard` と同じ。
  - ガードは親ルートの `initialDataResolver` より先に走り、直接開いたときは利用者の状態がまだ空。そこで `TokenState` と `UserState` の取得（`ROUTE_CHECK_MAX_AGE_MS` の使い回し）を**ガードの中で先に待つ**。
  - `canModerate()`（`editor` または `manager`）なら通す。未ログインは `/login?return_to=…` へ。ログイン済みで権限が無ければ「投稿管理の権限がありません」を出して `/` へ。
- 子ルートの `users/:userId` には別のガードを足さない。親のガードで足りる。

### EDITOR と MANAGER の出し分け

- `UserState` に `canModerate`（editor・manager）・`isManager`・`isViewer` を足し、画面側の出し分けはすべてこれで判定する。
- **EDITOR 以上**: 新着の一覧、投稿者のページの要約と目撃の一覧、まとめての無効化、過去の運用表の「この投稿者を見る」。投稿者の名前（username・displayName）は EDITOR 以上にだけ見せる。
- **MANAGER だけ**: BAN・解除、手がかりの表。**EDITOR のときは描かず、取得もしない。** 描いて隠すのでなく、`@if (isManager())` の中に置き、手がかりの取得（`fetchTraces`）は `isManager()` のときだけ呼ぶ。権限の無い api の口を叩いて 403 を出さないため。
- 自分と MANAGER のページには BAN のボタンを出さない（`canBan`）。api も 422 で断るが、押せる形で見せない。
- 手がかりの表は `shared: true` の行（その IP を使ったアカウントが多い。携帯回線などの共有 IP）を弱めて出す。BAN 済みの他のアカウントは赤い印で、押すとその人のページへ行く。

### ゲストの扱い

- 投稿者の無い目撃（ゲストの投稿、2026-10-23 より前の投稿）は、一覧で「ゲスト」と出し、投稿者のページへのリンクを付けない。
- 過去の運用表のメニュー「この投稿者を見る」は、押したときに `GET /sightings/:id/author` を引き、`userId` が null なら「ゲストの投稿です」と通知するだけで遷移しない。
- `sightedAsOperation`（運用を引き継いだ推測の目撃）では項目を無効にする。

### まとめての無効化

- **api は約 1 秒で区切り、手を付けなかった id を `pending` で返す**（api の ADR-0013。計画には無かった）。`ModerationService.invalidateSightings` が、`pending` が空になるか `failed` が出るまで同じ理由で**送り直し（最大 10 回）、結果を足し合わせて 1 つにまとめて返す**。画面は区切りを意識しない。
  - 結果の `invalidated`・`skipped` は足し、`failed`・`pending` は最後の回のものにする。
  - **2 回目以降が HTTP エラーなら、それまでの結果を残して `failed = { id: その回の先頭の id, message: '通信に失敗しました' }`・`pending = その回に送った ids` を入れて正常に返す。** 1 回目のエラーはそのまま投げる。途中で投げると、済んだ分が画面に分からなくなり、取り直しも走らないため。
  - 10 回で尽きて `pending` が残ったときは、通知で残りの件数を出す。
- 通知は「N 件を無効にしました」に、飛ばした件数（すでに無効・見つからない）と、`failed` があれば「〇〇で止まりました: message」を足す。
- 確認のダイアログ（`moderation-confirm-dialog`）で、件数と対象の名前を書き、理由（1〜200 字）を必須にする。BAN も同じ部品を使う。1 回に選べるのは 200 件まで（api の上限）で、超えたらボタンを押せなくして上限を示す。
- 無効化が済んだら、`QueryInvalidator.invalidate('sighting')` で目撃のキャッシュを捨て、投稿者の要約と目撃の先頭を取り直す。BAN・解除は目撃を取り直さず、返ってきた要約（`ModerationUserSummaryDto`）で画面の要約を差し替える。`QueryInvalidator.invalidate('sighting')` は BAN・解除の成功後にも呼ぶ（ほかの画面の目撃のキャッシュを捨てるため）。
- 規則違反（422）は api の message をそのまま通知に出す。

### 投稿者を切り替えたときの古い応答

- 投稿者のページはストアが `providedIn: 'root'` で残るので、`/moderation/users/A` から `B` へ移ると、A の応答が遅れて返って B の画面を書きうる。そこで、書く前に「いま見ている人か」を確かめる（`ModerationUserService.#isCurrent(userId)`）。
  - 取得（要約・目撃・手がかり）は、取得の世代番号（`isLatestSightings`・`isLatestTraces`）に加えて `#isCurrent` が真のときだけストアに書く。
  - ダイアログの確認を待つあいだ・無効化や BAN の応答を待つあいだに別の人へ移っていたら、通知も取り直しもしない。
  - 失敗の通知も、いま見ている人のものだけ出す。投稿者が 404 のときは、手がかりの失敗を重ねて出さない。

### 過去の運用表と投稿フォーム

- 過去の運用表の目撃のセルのメニューに「この投稿者を見る」を 1 行足す（既存の無効化・復元の後ろ。見た目は今のまま）。`canModerate()` のときだけ足し、`reporter`・`viewer`・ゲストには項目ごと出さない。
- `viewer`（BAN 済み）には投稿フォームを出さず、「投稿できません」と案内する。api は BAN 直後（JWT はまだ `reporter`）でも 403 を返すので、投稿が 403 で断られたら「投稿する権限がありません」と通知する。

## 退けた案

- **投稿者を権限なしの画面にも出し、名前だけ伏せる**: 投稿管理の画面は EDITOR 以上の仕事の場なので、入口ごと出さない。一般の利用者には今までどおり投稿者を見せない。
- **MANAGER だけの部分を描いて隠す（CSS・disabled）**: 取得まで走ると 403 が出る。描かず、取らない。
- **まとめての無効化の区切りを画面に出し、利用者に続きを押させる**: 送り直しは機械的にできる。誤りなら「残り N 件」を出す形に変えるだけで済む（service の中の変更）。
- **ガードを子ルートごとに足す**: 親で足りる。
- **`/operation/...` の下に置く**: 投稿管理は運用の閲覧ではなく管理の仕事。train-diagram と同じくトップレベルにそろえる。

## 結果

- 新しいページは 2 つ（`moderation-recent`・`moderation-user`）、`libs/moderation/`、`moderationGuard`、`UserState` の 3 つの computed。過去の運用表（`pages/operation/operation-past-time/…/operation-past-time-table`）と投稿フォーム（`shared/operation-post-card/operation-post-form`）は 1 項目・1 分岐の追加だけ。
- 各タスクごとに spec を書いた（service・store・guard・サイドナビ・各ページ・確認のダイアログ・過去の運用表・投稿フォーム）。

## 残っていること

- **この ADR は api の migration が本番に流れる前提。** api の `1793639742858-AddUserAccessTraces`・`1793642165620-AddUserRoleChanges` を先に流す（api の ADR-0013 の「出す順」）。流す前に client を出すと、手がかり・BAN の口が落ちる。プライバシーポリシー（#273）の追記が api より先に出ていることも条件。
- **実ログインでの目視が未了。** 412px と 1440px の両方で、EDITOR と MANAGER のログインで見る（手元の api は本番 DB を読む。BAN・無効化は本番に書くので、確かめは保存テスト用のアカウントで、元に戻せる範囲だけ）。確かめる点：
  - サイドナビの「投稿管理」の字下げ（他にアイコンの無い見出しの並び）。
  - 一覧の印（`newAccount`・`burst`）のバッジの見え方、投稿者の username リンク＋displayName。
  - 投稿者のページの要約で、登録日に年が出るか。
  - `users/:userId` が空パスの子ルートの後ろで正しくマッチするか。
  - 手がかりの表の `shared` の弱め方と、BAN 済みの印。
  - 確認のダイアログの件数・名前・理由の入力。
- 実装の最中に挙がった小さな保留（minor）は、台帳 `.superpowers/sdd/2026-11-03-moderation/progress.md` にある（もっと見るの失敗経路の spec、201 件以上の全選択で行き止まり等）。

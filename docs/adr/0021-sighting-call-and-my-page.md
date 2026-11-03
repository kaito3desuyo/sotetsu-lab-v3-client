# ADR-0021: 目撃募集とマイページ（M13）— 募集は client で導く、マイページはトップレベルの `my-page/`、CSR

- **日時**: 2026-11-04
- **Agent**: claude-sonnet-5
- **ステータス**: 採用済み（本番へのデプロイ前。マイページのログイン状態での目視が残る）
- **ブランチ**: feature/m13-sighting-call-and-my-page
- **関連**: spec `docs/superpowers/specs/2026-11-03-sighting-call-and-my-page-design.md`、計画 `docs/superpowers/plans/2026-11-03-sighting-call-and-my-page.md`、api の ADR-0014（`/v3/users/me` の 2 本と「裏付け」の判定はそちら。ここでは繰り返さない）、ADR-0020（投稿管理。ガード・CSR・手本のページ）、ADR-0011（ログイン・新規登録のページ、`return_to`）、ADR-0019（操作帯）

---

## 背景

- 11/6 21:00 に目撃の投稿を登録者だけにする（M1 登録制②）。登録した人が、また開いて投稿したくなる理由が要る。
- 目撃募集: 「いま走っているのに、今日まだ誰も見ていない運用」を見せて、見かけたら出してもらう。
- マイページ: 自分の投稿の数と、他の人の目撃との合い方を見せる。
- 本番の実測（2026-10-30 平日・11-01 土休日）で、平日は 104 運用のうち朝 9 時までに 83 運用に目撃が付き、昼過ぎまで 90 前後で止まる。土休日は昼でも 2 割ほど目撃が無い。一日の終わりにはほぼ埋まる。だから「目撃の無い運用の全部」でなく「いま走っているもの」に絞る。
- 設計はユーザーから任された。以下の決定は私の判断で、承認は spec のレビューで受ける。

## 決定

### 目撃募集は API を足さず client で導く

- real-time がすでに取っている在線（`currentPositions`）と今日の履歴（`operationSightingHistories`）から、`selectSightingCallOperations`（`pages/operation/operation-real-time/utils/select-sighting-call-operations.util.ts`）が選ぶ。在線は 1 秒ごとに更新されるので、帯もそれに合わせて増減する。
- 出す条件は両方満たすもの。
  - **いま走っている**: 在線に `current` がある、または `prev` と `next` の両方がある（折り返しの間）。出庫前（`prev` なし）と入庫後（`next` なし）は出さない。
  - **今日まだ目撃が無い**: 今日の履歴が配列として届いていて、空。
- **在線か履歴が届く前は出さない。** キーが無い運用は含めない。読み込み直後に全運用が「目撃なし」と数えられて、募集が光るのを避けるため。
- **絞り込み（会社・運用群）の後で数える。** `OperationRealTimeComponent.callOperations` が、運用順の一覧と同じ `filterRealTimeOperations` を通してから選ぶ。並びも運用順の一覧と同じ。
- **運用番号の無い運用は出さない。** `OperationDetailsDto.operationNumber` は省略できる。番号が無いと在線も履歴も引けず、チップの投稿先にもならない。util の型は `T extends { operationNumber?: string }` にして、番号の無い要素は飛ばす（計画の署名は `operationNumber: string` だったが、実際の一覧の型を通らなかった）。
- 休車（運用 100）は列車を持たないので、在線が無く、自然に出ない。

### 置き場と見た目

- **部品は `operation-real-time-sighting-call/`**（`operation-real-time/components/` の下）。real-time の操作帯の**下・凡例の上**に、貼り付かない白帯を 1 本。凡例と同じ左右の余白・上下 8px。
- **帯の下に罫線を 1 本引く**（`tw-border-b`）。凡例とのあいだに隙間を作らず、帯と凡例が続いて見えるようにする。main の gap 16px と横の gutter は負のマージンで打ち消す（凡例と同じ手）。
- **0 件のときは帯ごと消え、余白も残さない。** ホスト要素に `tw-contents` を付け、何も描かないときに main の flex の gap を取らないようにした（中の帯が flex の item になる）。
- 文言は 1 行目に「目撃募集」と「いま走っていて、今日まだ目撃の無い運用」、2 行目に運用番号のチップ。チップは折り返す。
- チップは `button`。見た目は `app-operation-number-link` と同じ（運用群の色の背景・高さ 28px・角丸）。**字はアプリの字**（`tw-font-[inherit]`）。preflight が無効なので、`button` はそのままだとブラウザ既定の字になる。
- 押すと、その運用番号を入れて投稿ダイアログを開く（行の投稿ボタンと同じ `OperationPostDialogService.open({ operationNumber })`）。
- ロック済みの real-time に新しい面を足すので、**実装より先に `docs/design.md` に掟を書き足した**（「操作カード」の節と履歴）。

### ゲストには見せてログインへ、viewer には出さない

- **ゲストにも帯を見せる。** 登録の誘いになるため。チップを押すと `/login?return_to=…`（`safeReturnTo(router.url)`）へ送る。ログインしたら real-time に戻る。
- **viewer（BAN 済み）には帯ごと出さない。** 投稿できない人に募集を見せない。

### マイページの入口

- **ルートは `/my-page`、置き場はトップレベルの `pages/my-page/`。** ページ名とディレクトリの対称の掟に合わせる。`/operation/...` の下には置かない（運用の閲覧ではなく、自分のアカウントの話）。
- **サイドナビ**: ログイン中（viewer を除く）だけ「アカウント」の見出しと「マイページ」を出す。置き場は「管理」の上（`canShowMyPage`）。
- **ヘッダー**: 「ようこそ ○○ さん」の名前を `/my-page` へのリンクにする。**下線を付ける**（`tw-underline`・色は `[color:inherit]`）。本文中のリンクは下線を付ける、が design.md の決まりで、入口だと分かるようにするため。`tw-text-inherit` は theme の色を置き換えている都合で CSS が出ず、既定の青が navy の上に出てしまう。任意プロパティで色を継がせた。
- **ガード**: `myPageGuard`（`pages/my-page/guards/my-page.guard.ts`）。形は `moderationGuard` と同じ。
  - ガードは親ルートの `initialDataResolver` より先に走るので、`TokenState` と `UserState` の取得（`ROUTE_CHECK_MAX_AGE_MS`）を**ガードの中で先に待つ**。
  - 未ログインは `/login?return_to=…` へ。viewer は「マイページは投稿できるアカウントだけが使えます」を出して `/` へ。reporter・editor・manager は通す。
  - パスの無い親に `canActivate` と `runGuardsAndResolvers: 'always'`。
- **SSR では描かない。** `app.routes.server.ts` に `my-page` と `my-page/**` を `RenderMode.Client`＋`NO_STORE` で足した。個人のページなので、サーバーで描かず CDN にも置かない。**sitemap には足さない**（公開のページではない）。
- ページ名の大見出しは置かない（ツールバーと二重になる）。

### マイページの中身

- 上から 2 枚。**要約**（投稿数・裏付けあり・別の運用の目撃あり・他の目撃なし・無効にされた数・最初と最後の投稿日時と注記）と、**投稿の一覧**（新しい順・1 行に目撃の日時・運用番号・編成番号・裏付けの印・「もっと見る」）。
- 手本は `pages/moderation/moderation-user`（ストアの持ち方・世代番号・重複排除・キーセット）。1 回に 50 件取る（`MY_PAGE_SIZE`）。
- `libs/user` に `findMySummary()`（`GET /v3/users/me`）、`libs/operation-sighting` に `findManyMine(params)`（`GET /v3/users/me/operation-sightings`）を足した。
- 0 件のときは「まだ投稿がありません」と、リアルタイム運用情報へのリンク。
- 注記は「ログインして出した目撃だけを数えます（記録は 2026年10月24日から）。裏付けは、同じ日に他の人が同じ編成を同じ運用で見たかどうかです。」。日付は本番の author 行の最古（2026-10-24 05:02 JST、2026-11-03 実測）による。

### 裏付けの言葉と色

| 値 | 画面の言葉 | 字の色 |
|---|---|---|
| `corroborated` | 裏付けあり | `--color-corroborated`（緑） |
| `conflicting` | 別の運用の目撃あり | **色なし** |
| `uncorroborated` | 他の目撃なし | 灰（`muted`） |
| `invalidated` | 無効 | 灰 |

- **`--color-corroborated` を新設した**（`src/tokens.css`・`tailwind.config.js`・design.md の色の表）。値は `--color-recency-yesterday` と同じ `oklch(50% 0.13 150)`（`#137738`）で、紙の上で 5.49:1。意味が鮮度（昨日）とは別なので別名にした。鮮度の色を流用しない。`--color-recency-today` は使わない（本日中の目撃の色で、意味が違う）。
- **`conflicting` に色を付けない。** 間違いと断じないため。運用の変更や同日の引き継ぎで、正しい投稿でもこうなる。
- 色だけに頼らず、言葉で書く。

### 端末に保存しない

- マイページのストアは `withSettingsStorage` も `withOfflineSnapshots` も付けない。個人のデータで、api も `no-store` で返す（`REALTIME`）。端末の localforage に残さない。圏外で開いたときは空になる。

### 運用番号は行路図へのリンクにしない

- マイページの運用番号は、運用群の色のチップで出すだけにして、行路図へのリンクにしない。行路図の URL には `operation_id` が要り、`/v3/users/me/operation-sightings` が `operationId` を返さないため。投稿管理の投稿者のページも同じく、リンクにしていない。
- 後で api の `MyOperationSightingDto` に `operationId` を足せば付けられる（api と client の小さな追加）。

### 順位・正答率・比較を作らない

- 数字の順位、正答率、他の人との比較は出さない。数を競わせると、雑な投稿が増えるため。出すのは自分の数と、裏付けの内訳だけ。

## 退けた案

- **募集のために API を足す（今日目撃の無い運用の一覧）**: real-time が在線と履歴をすでに持っている。足すと取得が二重になり、1 秒ごとの在線とのずれも出る。
- **目撃の無い運用の全部を出す**: 昼過ぎまで 90 前後が埋まるので、出庫前や入庫後の運用が並ぶだけになる。「いま走っている」に絞る。
- **カードそのものに印を付ける**: カードの 2 行構造と上段の 36px を崩す。
- **帯を操作帯の中に入れる・貼り付かせる**: 要約の行と重なり、縦を取る。貼り付かない白帯にした。
- **ゲストに帯を隠す**: 登録の誘いが無くなる。
- **`--color-recency-yesterday` をそのまま使う**: 意味が違う。同じ値でも別名にして、あとで片方だけ変えられるようにする。
- **`conflicting` を赤・警告色にする**: 投稿者を責める見え方になる。
- **マイページを端末に保存する**: 個人のデータで no-store。
- **投稿管理の画面と一つにまとめる**: 自分の投稿を見るページと、他人を管理するページでは、権限も中身も違う。

## 結果

- 新しいページは 1 つ（`pages/my-page`）、新しい部品は 1 つ（`operation-real-time-sighting-call`）、util は 1 つ（`select-sighting-call-operations.util.ts`）、`libs/user` と `libs/operation-sighting` への追加、`myPageGuard`、サイドナビとヘッダーへの 1 項目ずつ、`--color-corroborated`。
- **目視**（2026-11-04 07:31 JST、手元の client と master を読む api、本番 DB）:
  - 帯に 9 個のチップ（55・61・63・77・78・81・83・27K・31K）。55 のカードの最後の目撃は 11/03 で、選び方は合っている。
  - 375px と 320px でチップは折り返し、帯の文字の左端は凡例と同じ。帯と凡例のあいだに隙間は無い（罫線）。1440px でも帯の文字の左端は 64px で凡例と同じ。
  - チップの字はアプリの字で、高さ 28px。
  - ゲストがチップを押すと `/login?return_to=%2Foperation%2Freal-time`、ゲストが `/my-page` を開くと `/login?return_to=%2Fmy-page` へ行く。
- **320px の横はみ出し（`scrollWidth` 326）はこのブランチのせいではない。** master でも同じで、原因は閉じた操作帯の絞り込みのチップ「G群（目黒線）」。
- 小さな点: 375px で、見出しと説明の改行が語の途中で折れる（「目撃の無／い運用」）。

## 残っていること

- **マイページのログイン状態での目視が未了（ユーザーの確認待ち）。** reporter と editor で、412px と 1440px の両方で見る。手元の api は本番 DB を読む。確かめる点：
  - 要約の数と注記、投稿の一覧の行（日時・運用番号・編成番号・裏付けの印）の見え方。
  - 「裏付けあり」の緑、「別の運用の目撃あり」の色なし、灰の 2 つの区別。
  - 「もっと見る」の続き。0 件のアカウントでの空の表示。
  - ヘッダーの名前の下線とサイドナビの「アカウント」の位置。
- **この ADR は api の ADR-0014 の口が本番に出ている前提。** `/v3/users/me` が無いまま client を出すとマイページが落ちる。api を先に出す。
- 運用番号を行路図へのリンクにするには、api の DTO に `operationId` を足す（上記）。
- 実装の最中に挙がった小さな保留（minor）は、台帳 `.superpowers/sdd/2026-11-03-sighting-call-and-my-page/progress.md` にある（`#run` の失敗の通知に世代の確認が無い、`fetchNext` の古い応答の spec が無い等）。

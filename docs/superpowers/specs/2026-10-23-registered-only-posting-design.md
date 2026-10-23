# 目撃の投稿を登録者だけにする（client）設計

-   日付: 2026-10-23
-   ブランチ: `feature/registered-only-posting`
-   全体の設計: api リポジトリの `docs/superpowers/specs/2026-10-23-registered-only-posting-design.md`（目的・決めたこと・出す順）
-   ロードマップ: `docs/roadmap.md` の M1

## 1. 目的

-   ゲストには、投稿の口で「ログインが必要です」と案内する
-   ログインと新規登録を、ダイアログからページ（`/login`・`/register`）に移す。M4 の同意ページからも同じ入口に送れるようにする
-   socket の合図を、api が出す `{"type": …}` の形で受け、自分からは送らない

## 2. 今の作り

-   ヘッダーの「ログイン」「新規登録」は、それぞれ `LoginDialogComponent`・`RegisterDialogComponent`（`src/app/layout/components/`）を開く
-   目撃の投稿フォーム `operation-post-form`（`src/app/shared/operation-post-card/`）は、real-time の FAB から開くダイアログと、ダッシュボードの投稿カードの 2 か所で使う。ゲストにも同じフォームを出している
-   投稿に成功すると `this.#socket.emit('sendSighting', result)` を送る
-   `AppComponent` は socket から何か届けば、中身を見ずに目撃の画面内キャッシュを捨てる

## 3. 変更

### 3.1 ログイン・登録のページ

-   `/login?return_to=…` と `/register?return_to=…` を足す。今のダイアログのフォームと処理をページに移し、ダイアログ 2 つは消す
-   成功したら `return_to` に戻る。`return_to` は `/` で始まるサイト内の相対パスだけを受け付ける（`//` で始まるものや、`http:` などの外の URL は捨てて `/` に戻す。オープンリダイレクト対策）。無ければ `/`
-   見た目は Material の部品でそろえる。ログインと登録のページは互いにリンクし、`return_to` を引き継ぐ
-   ヘッダーの「ログイン」「新規登録」は、今いる URL を `return_to` に付けてページへ飛ばす

### 3.2 ゲストへの案内

-   `operation-post-form` は、ゲスト（ログインしていない）なら入力欄の代わりに「目撃の投稿にはログインが必要です」と、ログインと新規登録のボタンを出す。`return_to` は今の画面
-   real-time の FAB はゲストにも出す。ダッシュボードの投稿カードも同じ部品なので、同じ案内になる

### 3.3 合図

-   受け側: `{"type":"sighting"}` なら目撃、`{"type":"timetable"}` なら時刻表の画面内キャッシュを捨てる。それ以外は無視する
-   送る側: 投稿に成功した後の `emit('sendSighting')` を消す

### 3.4 403

-   投稿で 403 が返ったら（役割を外されたときなど）、「投稿する権限がありません」と出す

## 4. 出す順

api の spec の 6 章のとおり。client は api の後、socket が `sendSighting` を消す前に出す。

## 5. 確かめること

-   テスト: `return_to` の検証（相対パスだけ通す）、ゲストなら案内・ログイン済みならフォーム、合図の `type` ごとにどのキャッシュを捨てるか、投稿の後に emit しない
-   実画面: 375 幅と 1440 幅で、ログイン・登録のページ、FAB とダッシュボードのカードの案内を目視する。ログインしてから元の画面に戻ること
-   本番: ゲストで案内が出る、登録者で投稿すると別の端末の real-time が更新される

## 6. 公開の切り替え（フィーチャーフラグ・2026-10-23 追記）

全体は api の spec 9 章。コードを先に出しておき、告知した日に DB のフラグ（`registered_only_posting`）を on にして登録制を始める。

-   フラグで切り替えるのは、3.2 のゲストへの案内だけ。フラグが off ならゲストにもフォームを出す（api も off の間はゲストの投稿を通す）
-   フラグの外（常に有効）: ログイン・登録のページ、合図、403 の文言、無効化・復元で `userId` を送らない、時刻表の入力の出し分け
-   取得: `GET /v3/feature-flags`（`{ "registered_only_posting": true }` の形）を `libs/feature-flag` で読み、global state `FeatureFlagState` に置く。`initialDataResolver` の 2 つ目の `Promise.all` で取る。QueryCache の `maxAgeMs` を 60 秒にして、画面を移るたびに API を叩かない（api 側も 60 秒覚えるので、切り替えから画面に効くまで最大 2 分）
-   取れなかったとき・キーが無いときは off として扱う（今までどおりフォームを出す。on の後でも api が 403 を返し、3.4 の文言が出る）
-   確かめること: フラグ off ならゲストにフォーム・on ならゲストに案内・ログイン済みはどちらでもフォーム。本番は off のまま出し、SQL で on にして 2 分以内に案内に替わること、off に戻せること

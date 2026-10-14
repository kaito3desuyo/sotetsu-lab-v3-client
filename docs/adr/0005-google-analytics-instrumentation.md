# ADR-0005: GA4 の計測を、ユーザーの種類・目撃の投稿・重さとエラーまで広げる（`web-vitals` を足す）

- **日時**: 2026-10-13
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み
- **ブランチ**: feat/ga-user-properties

---

## 背景

- GA4 に送っていたのは、`app.component.ts` の NavigationEnd で送る page_view と、GA が自動で送るイベントだけだった。「どのページが見られたか」は分かっても、「誰が・何をしたか」「重かったか・壊れていたか」は見えなかった。
- 2026-10-13 に調べたところ、page_view が 1 回の画面移動につき 2 回届いていた。自前の送信に加えて、GA4 の拡張計測「ブラウザの履歴イベントに基づくページの変更」も数えていたからだ。列車ダイヤグラムでは、スクロールで URL を書き換える `Location.replaceState` まで page_view になっていた。
- 「列車を編集する」は 13 人で月 900 PV を超える。編集する人の操作が、一般の人の数字に混ざっていた。

## 決定

### 1. page_view は自前の送信だけにする（GA の管理画面での設定）

- 拡張計測の「ブラウザの履歴イベントに基づくページの変更」をオフにした（2026-10-13、ユーザー操作）。
- 送る・送らないをコードで決められるのは自前の送信のほうだからだ。`replaceState` で送らないという列車ダイヤグラムの狙いも、これで効く。
- この日から PV はおよそ半分になる。それより前の PV は、半分にして読む。

### 2. ログインの状態と役割をユーザープロパティで送る

- `GoogleAnalyticsService.setUserProperties` が `logged_in`（`'true'`・`'false'`）と `user_role`（役割。ログインしていなければ `guest`）を送る。`app.component.ts` が `UserStateQuery` を購読して、変わるたびに送り直す。
- userId と名前は送らない。

### 3. 目撃の投稿までの流れをイベントで送る

- `operation-post-card` が `sighting_form_start`（カード 1 枚につき最初の入力で 1 回）・`sighting_submit`・`sighting_submit_success`・`sighting_submit_failure` を送る。
- 失敗だけ `error_message` を付ける。入力した編成番号・運用番号は送らない。
- ほかの値（現在時刻か時刻指定か・status code）は付けない。GA4 では、値ごとにカスタムディメンションを登録しないとレポートに出ないからだ。何かを決める材料にならない値のために登録を増やさない（ユーザー判断 2026-10-13）。

### 4. 重さ（Core Web Vitals）とエラーを送る

- 依存に `web-vitals`（Google 製、gzip で約 3 KB）を足した。`core/web-vitals/WebVitalsReporter` が `provideAppInitializer` で起動し、`LCP`・`INP`・`CLS` を同じ名前のイベントで送る。値は `value`（delta）・`metric_rating`・`page_location`（`navigationURL`）で、web-vitals の README の推奨どおりだ。GA の値の形に直す処理は、純粋な関数 `toWebVitalsEvent` に切り出した。
- `ErrorHandlerService.handleError` が `app_error` を送る（`error_message` は `名前: メッセージ` を 100 文字まで）。同じメッセージは、1 回の読み込みにつき 1 回だけ送る。
- NavigationError（「ページの読み込みに失敗しました」）では `page_load_error` を送る。

### 5. 共通の約束

- イベントは `GoogleAnalyticsService.sendEvent` から送る。本番でだけ送るのは page_view と同じだ。
- GA のイベントの値は 100 文字までなので、文字の値は送る前に切る。
- 値を足すときは、同じ名前のカスタムディメンションを GA の管理画面に登録する。登録より前に送った値は、あとからレポートに出ない。今あるのは `logged_in`・`user_role`（ユーザー）、`error_message`・`metric_rating`（イベント）だ。

## 結果

- 編集する人と見るだけの人を分けて集計できる。
- 目撃の投稿のファネル（フォームに触った → 送信した → 成功・失敗）と、失敗の理由が見える。`sighting_submit_success` はキーイベントにする。
- ページごとに、LCP・INP・CLS の評価の内訳と、エラーの件数が見える。分布や p75 は GA の画面では出せないので、要るときは Data API で引く。
- 投稿に失敗すると、`sighting_submit_failure` と `app_error` の両方が届く。カードが失敗を `ErrorHandlerService` にも渡しているからだ。投稿の失敗を数えるときは、`sighting_submit_failure` を見る。

## 検討した代案

- **自前の page_view をやめ、拡張計測に任せる**: コードは減るが、`replaceState` のたびに数えられる問題が残る。
- **ページの種類を `content_group` で送る**: どのページも `pageResolver` でタイトルを付けており、GA の pageTitle で 13 種類にまとまっていた。要らなかった。
- **web-vitals の attribution 版で、遅い要素まで送る**: 値とディメンションが増える。poor が多いページが見つかってから足す。

## 追記（2026-10-14）

- gtag.js は load の後の空いた時間に読み込むようにした（docs/adr/0008）。読み込み前の `gtag()` は `dataLayer` に積まれ、後で送られる。読み込み前にタブを閉じた人のイベントは落ちる。

# ADR-0013: SSR の描き分けの決まり

- **日時**: 2026-10-24
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み（`ssr: false` のまま。有効にするのは計画 2c）
- **ブランチ**: feature/ssr-main
- **関連**: SSR の設計 `docs/superpowers/specs/2026-10-12-ssr-design.md`（4・5・6 章）、計画 `docs/superpowers/plans/2026-10-24-ssr-app-rendering.md`

---

## 背景

- SSR の HTML は CloudFront に置いて、来た人みんなで使い回す。人・日・端末で変わるもの（ログイン状態・今日・今・端末に保存した絞り込み）を入れると、別の人に古い値や他人の値が出る。
- ブラウザの最初の描画（hydration）は、サーバーの HTML と同じ形でなければならない。形が違うと Angular が食い違いのエラー（NG05xx）を出し、描き直しで画面が跳ねる。
- 2024 年に一度 SSR を入れたときは「API リクエストが多すぎてかえって遅くなった」ので止めた。サーバーで取ったものをブラウザで取り直してはいけない。

## 決定

- ページごとの描き方は `src/app/app.routes.server.ts` に書く。
  - 入力とログインのページ（ログイン・登録・メンテナンス・時刻表の追加・コピー・更新）は `RenderMode.Client` と `no-store`。
  - 公開の 10 ページは `RenderMode.Server` と long。
  - `'**'` は 404 と short。
  - ページは `SsrResponse` を通して長さを短くし（短い方が勝つ）、失効用のタグを足す。
- CDN に置く長さは次の 3 つの値（`src/app/core/ssr/cache-control.ts`）。
  - long: `public, max-age=0, s-maxage=604800, stale-while-revalidate=86400, stale-if-error=604800`
  - short: `public, max-age=0, s-maxage=60, stale-while-revalidate=60, stale-if-error=86400`
  - `no-store`
  - タグはヘッダー `Cache-Tag`。カンマ区切り・小文字で、`calendar:<id>` と `sighting-date:<YYYY-MM-DD>` の 2 種類。1 応答 50 個までで、超えたらタグを付けずに short にする。
  - 今日を含む期間の過去の運用情報は short にする。日の境は 4 時（それより前は前日）。
- 中身が今だけで決まるページ（ダッシュボード・リアルタイム運用情報・列車位置情報）は、枠と題名だけを描く。ホストに `ngSkipHydration` を付けて引き継がず、サーバーでは取得しない。
- 中身まで描くページで、ログイン状態や端末の保存で形が変わるところは `afterFirstRender` で包む。サーバーとブラウザの最初の描画では既定値を出し、描き終えてから本当の値にする。
  - 包んでいるのは、ヘッダーのログイン表示、全線時刻表の編集行と操作帯の畳み、ダイヤグラムの操作帯の畳みと「今」の表示（今へボタン・現在時刻の線・凡例）、運用表の運用群の絞り込み、行路図の今日のダイヤ、駅別時刻表の充当編成。
  - 「今日のダイヤか」で形が変わるところも包む。サーバーは今日のダイヤを取らず false で描くが、ブラウザは今日のダイヤを取り終えてから最初の描画をするので、今日のダイヤを開くと true で描いてしまう。`@if` は合わない dehydrated view を捨てて作り直すので NG05xx にはならないが、hydration 時に要素が現れて跳ねる。
  - 属性の値だけ変わるところ（disabled など）は包まない。取得するかの判断など、形に関わらない使い先も包まない。
- サーバーは、引数の足りない URL を今日・今で補わない（補うリダイレクトも取得もしない）。今日・今を CDN に残さないため。補うのはブラウザに任せる。
- API の取得やサーバーの描画に失敗したら `no-store` にする。壊れた HTML を CDN に置かない。3xx は short（すでに `no-store` なら触らない）。
  - 401 は `AuthInterceptor` がトークンを取り直して 1 回送り直すので、1 回目の 401 だけ数えない。送り直した要求には `AUTH_RETRIED`（`HttpContextToken`）の印を付け、印のある要求の 401 は直らない失敗として `no-store` にする。
  - `setCachePolicy` の始まりはルートの既定（headers の Cache-Control）。ページはそれより長くできない。
- 運用表のカード（104 枚）は、サーバーでは中身まで描く（検索のため・ユーザー判断）。ブラウザでは incremental hydration（`@defer (on viewport; prefetch on idle; hydrate on viewport)`）で画面に入ったものから引き継ぐ。
- サーバーで取った API の応答は HttpTransferCache で HTML に積み、ブラウザで取り直さない。
  - Angular 22 は、`Cache-Control` が `private`・`no-store`・`no-cache` の応答を既定で積まない。API の v3 の GET は CloudFront での共有を避けるために `private` を返すので、そのままだと何も積まれない。
  - そこで `withHttpTransferCacheOptions({ includeNonCacheableRequests: true, filter: isTransferableRequest })` を使い、`apiUrl/v3/` の要求だけを積む。同じ中身はもう HTML に描かれているので、新たに漏れるものは無い。
  - BFF（`/api/` の認証・プロフィール・メンテナンス）は積まない。
  - `cache` が `reload`・`no-store`・`no-cache` の要求も積まない（filter で外す）。`includeNonCacheableRequests: true` にすると Angular はこの指定を見なくなるが、列車情報を書いた後の 1 時間は時刻表系の GET が `cache: 'reload'` になる（ADR-0002 の書いた後の窓）。これを CDN の古い HTML に積まれた応答で答えると、書いた直後の画面が古いままになる。
- サーバーの描画は 1 本ずつ（`server.ts` の Promise の列。応答を書き終えるまで次を待たせる）。Elf ストアがプロセス全体で 1 つで、描画の始めに空にするので、描画が重なると先の描画の途中でストアが空になり、取得の済んだ一部だけが残った壊れた HTML がエラーも出ずに long で置かれる。
  - 本番の Lambda は 1 環境 1 リクエストなので、もともと重ならない。この列は、手元の確かめと、並行に受ける実行環境（Web Functions など）のための守り。静的ファイルの配信は並べない。
- 題名・説明・OGP（og:title・og:description・og:url・og:image・og:type・og:site_name・og:locale・twitter:card）は `PageMeta` で入れる。`TitleService` は無くした。
  - `pageResolver` がルートの題名を入れ、ページは詳しい題名（例: `二俣川駅 時刻表（上り・2026/3/14改正 平日ダイヤ）`）を `setTitle` で上書きする。
  - 同じページで resolver が再び走っても、詳しい題名は消えない。

見送った案:

- 部品ごとに `isPlatformServer` を見て分ける。対象が多くて漏れる。サーバーと最初の描画を同じにするという約束も、一か所にまとまらない。
- 枠だけのページを汎用の骨組みに差し替える。ページの本当の骨組みとの差で画面が跳ねる。
- Elf ストアを DI に移してリクエストごとに分ける。大工事になる。計画 1 で「1 プロセス 1 描画＋描くたびにストアを戻す」にした。
- API の `private` をやめて HttpTransferCache の既定に合わせる。API の応答が CloudFront で共有され、認証を素通りする（2026-10-07 に却下した形に戻る）。

## 影響

- ヘッダーが固まった後に起きたエラー（`@angular/ssr` の `content()` の中、つまり直列化・ng-state の書き出し）は `no-store` にできない。`Response` を作った後なので `setCachePolicy` が効かない。構造上どうにもならないので、ここに残す。

- HTML が大きい（2026-10-24、手元で計測。ng-state を含む）。
  - 運用表: 13.1MB（gzip 684KB）
  - ダイヤグラム: 4.9MB（gzip 567KB）
  - 駅別時刻表: 3.9MB（gzip 353KB）
  - 全線時刻表: 3.6MB（gzip 375KB）
  - Lambda の応答は 6MB までなので、計画 2c で応答の圧縮が必須になる。
- サーバーで描くページで、形が端末やログインで変わるところを足すときは `afterFirstRender` で包む。サーバーで取るか取らないかは、今日・今に依るかで決める。
- 新しいページは `app.routes.server.ts` に描き方を足す。足さないと `'**'` の扱い（404・short）になる。
- 残り
  - Lambda と配信で SSR を有効にする（計画 2c）。
  - API のタグ失効（api リポの計画 3）は 2c の前提。2c より前か同時に出す。ブラウザの取り直し（`cache: 'reload'`）で古い HTML を直す逃げ道は、引き継ぎがあっても filter で残してあるが、CDN の HTML 自体はタグ失効が届くまで古い（最長 1 週間＋stale-while-revalidate）。
  - 当たらない URL（dist に無い静的ファイル・ボットの総当たり）も `'**'` で SSR で描き、`initialDataResolver` で API を取るので、2c で拡張子付きのパスは SSR の前に 404 で返す。
  - 圏外の保存と Service Worker（計画 2b）。

# SSR の導入 設計

- 日付: 2026-10-12
- 対象: sotetsu-lab-v3-client / sotetsu-lab-v3-infrastructure（web モジュールを外すだけ）
- 状態: 設計合意済み・spec レビュー待ち
- 改訂: 2026-10-24 画面の配信を Terraform から client の osls に移す（3・8・9・12 章）。index.html のキャッシュは client #275 で先に直す（2.2・6.6・8 章）
- 改訂: 2026-10-24 計画前の下調べ（コードの洗い出し・AWS の文書）と、それを受けたユーザー判断を反映（2.4・4・5・6.2・7.1・13 章）。Function URL に決定・列車番号ページは外す・過去の運用情報も中身まで描く・失効は API が出す

## 1. 目的

次の 4 つをすべて満たす。

- A. 検索に載る（駅別時刻表・運用表などのページが検索で出る）
- B. SNS で共有したときに、ページごとの題名・説明が出る（OGP）
- C. 最初の表示を速くする（特にスマホ）。ISR などを使い、とにかく速くする
- D. 通信が通らない場所でも表示できる（PWA）

## 2. 前提として確かめたこと

### 2.1 これまでの経緯

- 2024-11-02 に SSR を入れ（6442c4eb）、SSR の邪魔になるところを直し（22aeab90）、同じ日に止めた（3ee2de54「一旦SSRを無効化する」）
- 止めた理由（ユーザー談）: **API リクエストが多すぎて、かえって遅くなった**
- 見立て（推測・当時の記録なし）: 全ページを毎回サーバーで描いていた。real-time のようにすぐ古くなるページまでアクセスのたびに API を叩き、SSR と API の Lambda の寝起きが重なった
- 部品は残っている: `angular.json` の `server: src/main.server.ts`、`server.ts`、`app.config.server.ts`（`provideServerRendering()`）、`app.config.ts` の `provideClientHydration(withNoIncrementalHydration())`。`"ssr": false, "prerender": false` で止めてある

### 2.2 今の配り方

- タグを push すると GitHub Actions がビルドし、`aws s3 sync … --cache-control "max-age=31536000"` で S3 に置き、CloudFront を `/*` で失効させる
- CloudFront（Terraform `modules/web/_cloudfront.tf`）: 既定は S3（`spa-routing` 関数で index.html に寄せる）、`/api/*` は BFF
  - Terraform の web モジュールにあるのは、S3 バケット・バケットポリシー・OAC・配信・GitHub Actions の secret 2 つ（`DEPLOY_BUCKET_NAME`・`CLOUDFRONT_DISTRIBUTION_ID`）
  - `spa-routing` 関数はどの道具でも定義されておらず、ARN の直書きで参照している（手で作ったもの）
  - 証明書（ACM・us-east-1）は変数で受け取っている
- API の配信（`api.sotetsu-lab.com`）は Terraform でなく、api の `serverless.ts` の `resources` に CloudFormation で書いてある（Lambda の Function URL・OAC・キャッシュポリシー・CloudFront からの呼び出しの許可）
- index.html にも 1 年のブラウザキャッシュが付いていた。client #275（2026-10-24）で、名前にハッシュの付くファイルだけ 1 年、それ以外は `no-cache` にする 2 回の `s3 sync` に分けた

### 2.3 Angular 22 の仕組み（angular.dev）

- ページごとに描き方を選べる（`app.routes.server.ts` の `RenderMode.Server` / `Prerender` / `Client`）
- HttpTransferCache: サーバーで取った GET の結果を HTML に埋め、ブラウザで取り直さない。`provideClientHydration` で標準で効く

### 2.4 置き場所の検討

- Cloudflare Workers: 公式の雛形（create-cloudflare の Angular 用）で Angular SSR が動く。無料プランは 1 リクエスト CPU 10ms まで（SSR には足りない見込み・未実測）、有料は月 $5。API が東京にあるので、利用者の近くで描く利点は日本の利用者には効きにくい。ドメインの付け替えも要る → 見送り
- 常時起動のサーバー（ECS・App Runner）: 誰も来なくても費用がかかる → 見送り
- Lambda@Edge: us-east-1・制限がきつい → 見送り
- **Lambda に決定**。寝起きは CDN に長く置き stale-while-revalidate で裏で描き直すことで、利用者がほぼ踏まないようにする（6 章）
- 配り方は **osls**（API と同じ。MIT・Serverless Framework v3 をもとにした版。2026-09-25 時点で手入れが続いている）。sls のライセンス問題は osls で避ける
- 候補（2026-10-13 追記）: **Lambda Web Functions**（2026-10-12 GA。[記事](https://dev.classmethod.jp/articles/aws-lambda-web-functions-ga-express/)）。従来の Lambda（Function URL）とどちらにするかは計画のときに決める
  - わかっていること: Express などの HTTP サーバーを、変換用のアダプター無しでそのまま動かせる。東京リージョンで使える。ランタイムは Node.js 24（記事で確かめられているのはこれだけ）。1 つの実行環境で複数のリクエストを同時に受けられる。ストリーミングも動く
  - 料金: リクエストは $0.30／100 万（従来は $0.20）。CPU は処理している間だけ課金され、API の応答待ちは課金されない。メモリの単価は従来の約 1/4 だが、実行環境が動いている間ずっと課金される（比較はバージニア北部の数字）
  - 合う点: `server.ts`（Express）をそのまま載せられる。SSR は API の応答待ちが長い。描き直しが重なっても 1 つの環境で受けられ、2024 年の失敗（寝起きの重なり）を弱められる
  - 合わない恐れ: この設計は CDN に長く置き、Lambda まで届くのはまれ。アクセスが少ないなら従来の Lambda のほうが安いと記事も書いている
  - 計画で確かめること: ① CloudFront の配り元にして OAC で守れるか ② osls（CloudFormation）で定義できるか（記事は `aws lambda-web deploy` だけ）③ 誰も来ない間のメモリの課金の扱いと、相鉄ラボのアクセス量での月額
  - どちらにしても `server.ts` は同じ Express なので、今は決めない
- **決定（2026-10-24・ユーザー判断）: 従来の Lambda＋Function URL**。AWS の文書で確かめたこと:
  - osls は Web Functions に対応していない（`AWS::Lambda::WebFunction` 等を `resources` に手で書くことになり、通るか未検証）。Web Functions はコードを S3 の object で渡す必要がある
  - 料金は Web Functions に無料枠の記載が無く、メモリは実行環境がある間ずっと課金。従来の Lambda は月 100 万件・40 万 GB 秒の無料枠がある。CDN の後ろで Lambda まで届く数は少ない
  - Function URL も OAC で守れる（origin type `lambda`・`AuthType: AWS_IAM`・`lambda:InvokeFunctionUrl` と `lambda:InvokeFunction` を CloudFront に許可）。POST/PUT には body の sha256 が要るが、SSR は GET だけ
  - Web Functions の利点（アダプター無し・1 環境で並行）は、この規模では効かない
  - 出典: Lambda の料金ページ・Web Functions の実行環境の文書・CloudFront の Lambda オリジンの OAC の文書（2026-10-24 読み取り）

## 3. 全体の形

```
ブラウザ ─→ CloudFront（client の osls）
              ├─ /api/*                         ─→ BFF（今のまま）
              ├─ JS・CSS・フォント・画像・assets/* ─→ S3（今のまま・長く置く）
              └─ それ以外（画面の URL）          ─→ SSR の Lambda（Function URL・OAC）
                                                  └─ API（v3）を呼んで描く
```

- client に `serverless.ts` を置き、osls で配る。中身は SSR の Lambda と、画面の配信一式（S3 バケット・CloudFront・OAC・キャッシュポリシー・CloudFront からの呼び出しの許可）。書き方は api の `serverless.ts` にそろえる
- SSR の Lambda: `@angular/ssr` の Node 用の仕組みを Lambda で動かす
- CloudFront: Lambda の Function URL を配り元にし、CloudFront からだけ呼べるように OAC で守る。既定の振り分けから `spa-routing` 関数を外す
- Lambda と配信を同じスタックに置くので、配り元の URL と呼び出しの許可（配信の ARN）を `Ref`・`Fn::GetAtt` で互いに参照できる。道具をまたいだ値の受け渡しは要らない
- 配る手順: タグの push で `osls deploy` → S3 同期 → 失効。バケット名・配信 ID は GitHub の secret でなく、スタックの Outputs から読む
- Terraform は画面の配信から手を引く（12 章）。network・database・api のモジュールは今のまま Terraform に残す

## 4. ページごとの描き方

分け目は「中身がどれくらいの速さで古くなるか」。

| 種類 | ページ | 描き方 | CDN |
|---|---|---|---|
| 改正のときにしか変わらない | 駅別時刻表・全線時刻表・運用表・運用行路図・列車ダイヤグラム | `Server`。中身まで描く | 長く置き、入力したら失効（6 章） |
| 過ぎた日の記録 | 過去の運用情報 | `Server`。中身まで描く | 期間に今日（鉄道の日付）を含まなければ長く置き、その日の目撃が書き換わったら失効。今日を含むなら短く（6.2） |
| 変わらない | 相鉄の車両（`/library/vehicle`） | `Server`。中身まで描く（API を叩かない） | 長く置く。デプロイで失効 |
| 刻々と変わる | ダッシュボード・real-time・列車位置情報 | `Server`。枠と題名・説明だけ描き、中身はブラウザで取る | 長く置く（枠と題名は変わらない） |
| 入力・ログインが要る | 列車情報の入力（add・copy・update）・ログイン・新規登録・メンテナンス | `Client` | `no-store` |
| 存在しない URL | `'**'` ルートを足す | `Server`。404 の枠を描き、状態コード 404 を返す | 短く |

- 「列車番号」のページは client に無い（列車番号は全線時刻表へのリンク）。この spec の対象から外す（2026-10-24・ユーザー判断）
- 過去の運用情報は spec に無かったページ。中身まで描く（2026-10-24・ユーザー判断）
- メンテナンスは「メンテ中かどうか」で行き先が変わるので CDN に置かない。ほかのページもメンテ判定（`maintenanceGuard`）はサーバーで通さない（13.2）

- Prerender（ビルド時に作る）は使わない。時刻表は駅×ダイヤ×方向でページ数が多く、URL は matrix param（`;calendar_id=…`）で、入力すればすぐ変わる。「描いて置き、入力したら失効させる」（6 章）で足りる
- 前回との違い: 全ページを毎回描くのをやめ、描くのは古くならないページだけにし、しかも CDN に置いて使い回す

## 5. サーバーで描くときの約束

### 5.1 題名・説明・OGP

- ページごとに `Title`・`Meta` で、題名・説明・`og:title`・`og:description`・`og:url` を入れる
  - 例: 駅別時刻表「二俣川駅 時刻表（下り・平日）｜相鉄ラボ」
  - 例: real-time「相鉄線 リアルタイム運用情報｜相鉄ラボ」
- `og:image` はサイト共通の 1 枚
- 題名に入れる名前（駅名・運用番号など）は、そのページで取っているデータから作る。題名のためだけに API を叩かない

### 5.2 サーバーで API を叩くのは、中身まで描くページだけ

- 中身まで描くページ: サーバーで取って描く。取った結果は HttpTransferCache で HTML に埋め、ブラウザで取り直さない
- 枠だけのページ: サーバーでは取らない。取得の入り口で「サーバーなら取らない」と分ける
- 目撃のソケット・localStorage・`window` など、ブラウザにしかないものはサーバーで動かさない
  - 2024 年の 22aeab90 は SSR の守りを足したコミットではなく、ほとんどが書き換え（`lastValueFrom`・dayjs→date-fns など）。今も効いている守りは `layout.component.ts` の `typeof window` の 1 か所だけ（2026-10-24 洗い出し）。守りは新しく入れる（13.2）
- 「今日」で変わるもの（今日のダイヤへのリンク・今日の充当編成・目撃の断面）は、中身まで描くページでもサーバーで描かない。CDN に置くと古い「今日」が全員に配られる

### 5.3 ログイン状態

- HTML は CDN に置くので、**ログインしているかどうかで中身が変わるもの（管理者だけのボタンなど）はサーバーで描かない**。CDN に置いたものが別の人に見える事故を防ぐ
- 該当する箇所（2026-10-24 洗い出し）
  - 全ページのヘッダーの挨拶（「ようこそ○○さん」／「ゲスト さん」）
  - 全線時刻表の編集・コピーの行と、それに伴う罫線の切り替え（`canEdit`）
  - ダッシュボードの投稿カード（時刻表・運用）と real-time の投稿ダイアログ。どちらも枠だけのページの中なので、サーバーでは描かない
- サーバーではゲストとして描き、ブラウザで起動した後にログイン状態で描き直す。サーバーはプロフィールを取らない

## 6. 速さ（ISR）

### 6.1 待たせない: stale-while-revalidate

- 中身まで描くページ・枠だけのページは `Cache-Control: s-maxage=…, stale-while-revalidate=…, stale-if-error=…` を返す（CloudFront は両方に対応している。AWS の文書で確認済み）
- 期限が切れても置いてある HTML をすぐ返し、描き直しは裏で行う。利用者が Lambda の寝起きを踏むのは、そのページを初めて描くときだけ
- 配り元が落ちても `stale-if-error` で古いページが出続ける
- stale を返せる長さは CloudFront の最大 TTL で頭打ちになるので、キャッシュポリシーの最大 TTL も合わせる
- ブラウザには長く置かない（`max-age` は短く）

### 6.2 長く置き、変わったときだけ捨てる: オンデマンドの描き直し

- 時刻表・運用表は改正か入力でしか変わらないので、`s-maxage` は長く（例 1 週間）
- 入力を保存したら、その範囲の CloudFront のキャッシュを失効させる。**失効は API が書き込みの後に出す**（2026-10-24・ユーザー判断。書いた calendarId を知っているのは API。ブラウザに AWS の権限を渡さずに済む）
- **キャッシュタグで失効させる**: SSR の応答にタグのヘッダーを付け（例 `calendar:<calendarId>`・`sighting-date:<YYYY-MM-DD>`）、配信に `CacheTagConfig` を書く。API は `#calendar:<id>` を失効させる。matrix param で URL が散らばっても 1 つで消える
  - タグは 1 つの応答に 50 個まで・1 個 256 文字まで・大文字小文字を区別しない
  - Lambda の応答で使えるヘッダー名（S3 の例は `x-amz-meta-*`）は文書に例が無い。実装の最初に実際に試す
- 失効の料金（AWS の文書・2026-10-24）: 月 1,000 パスまで無料（アカウント全体）。`/*` は何件消しても 1 パス。タグ 1 つも 1 パス。1 回の依頼にまとめても数えるのはパスの数
- 書き込みの量（本番 DB・2026-10-24）: 列車情報の書き込みは月 5〜123 件。ただし改正の入力では短い間に大量に書くので、API は同じ calendarId の失効を数分にまとめる（やり方は API 側の spec で決める）
- 目撃は月 3,700 件前後。1 件ごとに失効させると無料枠を超えるので、過去の運用情報は「期間に今日を含むページは短く置く（例 `s-maxage=60`）」で賄う。後日の目撃の訂正は過去 6 か月で 0 件なので、その時だけ `#sighting-date:<日付>` を失効させる
- 失効のあとに描き直すとき、API 側の時刻表キャッシュ（1 時間）に古いものが残っていないこと
- API 側の作業（タグの失効・まとめ方・権限）は api リポジトリの spec と ADR に書く

### 6.3 日本中で同じキャッシュを使う: Origin Shield（東京）

- CloudFront の Origin Shield を東京に置き、どの拠点も 1 つのキャッシュを見に行くようにして、Lambda を起こす回数を減らす

### 6.4 先に描いておく: 温め

- デプロイ・失効のあとに、主な駅の時刻表・運用表などを一通り開いて、キャッシュを満たしておく

### 6.5 Lambda を速くする

- メモリを多めに（CPU も増える）、arm64、API と同じ warmup プラグインで寝起きを減らす

### 6.6 古い版の JS・CSS を残す

- 古い HTML を返す以上、その HTML が読む古い版の JS・CSS が残っていなければならない。client #275 の 2 回の `aws s3 sync --delete` のうち、ハッシュ付きのファイルの回から `--delete` を外し、古いファイルをしばらく残す配り方に変える（残す長さは、stale を返す最大の長さ以上。消し方は S3 のライフサイクルか配る手順の中で、計画で決める）
- index.html などハッシュの付かないファイルは SSR では Lambda が返すので、S3 に残す意味は Service Worker の殻と切り戻し（9 章）だけになる

## 7. PWA（圏外でも見られる）

### 7.1 今あるもの

- Service Worker（ngsw）が JS・CSS・index.html を先読みして保存し、2 回目以降の画面の URL には保存した index.html を返す（`navigationRequestStrategy` 既定の `performance`）
- ページのストアを localforage に保存しているのは 7 つ: ダッシュボード・運用表・列車ダイヤグラム・real-time・投稿カード・列車情報の入力の下書き・全線時刻表
  - real-time は設定の 5 項目だけ（選んだ会社・運用群・自動更新など）。2026-07-17 のデザイン刷新（b4166a1f）で絞られた。理由は残っていない
  - 全線時刻表は操作帯の畳み状態の 1 項目だけ。駅別時刻表は何も保存していない
- Service Worker の dataGroups は `/api/**`（freshness・`maxSize: 10`・`maxAge: 1d`・`timeout: 10s`）の 1 つ。`/api/**` は BFF（`v3.sotetsu-lab.com/api`）で、データの API（`api.sotetsu-lab.com`）は別のオリジンなので、**時刻表などのデータは今は保存されていない恐れがある**（コードを読んだ推測。実装の前にネットワークの記録で確かめる）

### 7.2 SSR との役割分担

- 初めての人・検索エンジン・SNS のプレビューには SSR の HTML が届く（A・B・初回の C）
- 2 回目以降は Service Worker が保存した殻ですぐ起動する（`performance` を保つ。`freshness` にはしない。angular.dev も既定の `performance` を勧めている）
- 圏外でも、すべての URL で殻が起動すること

### 7.3 SSR で開く穴と、その手当て

- SSR で描いたページはデータを HTML に埋めて渡すので、ブラウザは API を叩かず、Service Worker の API の保存にも残らない。手当てをしないと、SSR で初めて開いた時刻表は圏外で出ない
- 手当て: **表示したデータをストアごと localforage に保存する**（ユーザー判断。「ストア全体保存は通信断用」の方針を広げる）
  - 新しく保存する: 駅別時刻表・全線時刻表
  - real-time も設定だけでなく、データごと保存に戻す（ユーザー判断）
  - そのほかの SSR で中身まで描くページ（運用行路図・過去の運用情報）も、保存していなければ同じく保存する
- 圏外で保存したデータを出すときの約束
  - 取得に失敗しても読み込み中の表示を解く（解かないと保存したデータまで出ない）
  - real-time など刻々と変わるページは、最後に取った時刻（「○時○分時点」）を見せ、古いデータだと分かるようにする
- Service Worker の API の保存も広げる: 件数を増やす（例 100 件）・期間を延ばす（例 7 日）・待ち時間を縮める（例 3 秒）。数字は計画で詰める

### 7.4 ビルドで確かめること（推測が混じるので計画の最初に確かめる）

- SSR のビルドでも、Service Worker が返す殻（ブラウザで描くための index.html）が出力されるか。名前が変わるなら `ngsw-config.json` の `index` を合わせる
- Service Worker が返した殻（SSR の印が入っていない HTML）で起動したとき、hydration が警告を出したり二重に描いたりしないか
- 新しい版を配ったときの更新（`app-update.service.ts`）が、SSR でも今までどおり効くか

## 8. CloudFront

- 振り分け
  - `/api/*` → BFF（今のまま）
  - 拡張子（js・css・フォント・画像など）と `assets/*` → S3（今のまま）
  - それ以外 → SSR の Lambda
- CDN の鍵は「パス（matrix param を含む）＋クエリ」。Cookie・Authorization は鍵にも Lambda にも渡さない
- index.html の 1 年キャッシュの問題（2.2）は client #275 で先に直す。SSR の後は HTML が Lambda から来る。S3 に残す静的ファイルは名前にハッシュが付くので 1 年のままでよい

## 9. 切り戻し

- 振り分けの既定先を S3＋`spa-routing` に戻せば今の形に戻る。osls の設定値（stage の param）1 つで切り替えられるようにする
- Lambda が落ちたら S3 の index.html を出す、CloudFront のオリジングループの自動切り替えを付ける

## 10. 確かめ方

- C（速さ）: 入れる前と後で、スマホを真似て、開いてから中身が出るまでの時間を測る（駅別時刻表・運用表・real-time・ダッシュボード）。Lambda と API の起動回数・時間も前後で比べる
- B（プレビュー）: Discord・X に URL を貼り、題名と説明が出ることを確かめる
- A（検索）: リリース後に Google Search Console で、ページが読まれ登録されることを確かめる
- 中身まで描くページで、ブラウザが同じ API を取り直していないこと（HttpTransferCache が効いていること）を、ネットワークの記録で確かめる
- ログインしたまま開いたページが、CDN 経由で別の人に見えないことを確かめる
- 期限切れのページで、すぐに古い HTML が返り（`x-cache` などで確かめる）、裏で描き直されること
- 入力して保存したら、そのページの次の表示に反映されること（失効が効いていること）
- デプロイの直後に、古い HTML が古い JS・CSS を読めること
- D（圏外）: Playwright でネットワークを切り、一度見たページ（駅別時刻表・運用表・real-time）が古いデータで出ること。SSR で初めて開いたページも含める

## 11. やらないこと（この spec の範囲外）

- ページごとの OGP 画像
- Prerender
- Cloudflare Workers への移行
- 臨時列車・車両の行程表（別 spec: sotetsu-lab-v3-api `docs/superpowers/specs/2026-10-12-special-trips-design.md`）

## 12. 画面の配信を Terraform から osls に移す（2026-10-24 追記）

ユーザー判断: 画面の配信は Terraform をやめて osls に寄せる。範囲は web モジュールだけで、network・database・api のモジュールは Terraform に残す。

### 12.1 移すもの

| 今（Terraform web モジュール） | 移した後（client の `serverless.ts`） |
|---|---|
| S3 バケット・公開ブロック・バケットポリシー | 同じものを `resources` に書く |
| OAC（S3 用） | 同じ。SSR の Lambda 用の OAC も足す |
| CloudFront の配信（`v3.sotetsu-lab.com`・S3 と BFF の配り元） | 同じ。SSR の Lambda の配り元と振り分けを足す |
| GitHub Actions の secret（バケット名・配信 ID） | 作らない。デプロイのワークフローがスタックの Outputs から読む |
| `spa-routing` 関数（手で作ったもの・ARN 直書き） | 切り戻し（9 章）で要るので、`AWS::CloudFront::Function` としてスタックに書く。中身は今のものを写す |

- 証明書（ACM・us-east-1）は今のものを ARN で参照する（api と同じ）
- ワークフローに AWS の権限で `osls deploy` を足す。権限の渡し方は api のワークフローにそろえる

### 12.2 移し方（2026-10-24 に AWS の実物を読んで決めた）

AWS で読んだ事実（読むだけ・2026-10-24）:

- `v3.sotetsu-lab.com` の Route 53 の A レコード（別名）は、今の配信 `E5C8TB9HLVQF9`（d2o0t3cxrqtg36）ではなく、**2024 年の SSR の配信 `EOE7HW33MVGR6`（d1xqnisz459zf9・別名 `*.sotetsu-lab.com`）を指している**。CloudFront は Host で配信を選ぶので、ちょうど一致する別名を持つ `E5C8TB9HLVQF9` が答えている
- `EOE7HW33MVGR6` は、2024 年に client の osls で作ったスタック `sotetsu-lab-v3-prod-client-cfstack` の `AppCloudFrontDistribution`。同じスタックに 2024 年の SSR の Lambda（nodejs20.x）・Function URL・Lambda 用の OAC・キャッシュポリシーが残っている。osls の配置用バケット `sotetsu-lab-v3-prod-client-sls-deployment-bucket` も残っている。`serverless.ts` は client の履歴をまとめたときに消えている
- 証明書 `1c93cef5…` は `sotetsu-lab.com` と `*.sotetsu-lab.com` を含む
- CI のロール `GitHubActionsRole` は `AdministratorAccess`（`repo:kaito3desuyo/*` から引き受けられる）。osls の deploy に権限は足りる
- osls には既存のリソースを取り込む機能が無い（CloudFormation の取り込みを手で行うしかない）

決めたこと:

- 新しいスタックは作らず、**2024 年のスタック `sotetsu-lab-v3-prod-client-cfstack` を新しい `serverless.ts` で上書きする**。配信は同じ論理 ID `AppCloudFrontDistribution` のまま、配り元を S3＋BFF・`spa-routing` 付きに変える（今の `E5C8TB9HLVQF9` と同じ形）。2024 年の Lambda 一式はテンプレートから外して消す
- S3 バケットは新しく作る（`sotetsu-lab-v3-prod-client-web-bucket`）。Terraform のバケットは取り込まない
- 切り替えは、`E5C8TB9HLVQF9` から別名 `v3.sotetsu-lab.com` を外すだけ。DNS はもともと `EOE7HW33MVGR6` を指しているので、外した瞬間からワイルドカードの別名でそちらが答える。DNS は変えない
- 切り替えた後に、`EOE7HW33MVGR6` の別名を `*.sotetsu-lab.com` から `v3.sotetsu-lab.com` に変える
- 切り替えの前に `terraform state rm module.web` で Terraform の手を引かせる（後から `apply` されて別名が戻るのを防ぐ）
- 古い配信・バケット・OAC・手で作った `spa-routing` 関数・GitHub の secret 2 つは、切り替えから 1 週間たって問題が無ければ消す
- infrastructure の master には、database 周りの未コミットの変更がある。web モジュールを外すコミットはこれと混ぜない
- 順番: 先に今の形のまま（SSR 無し）で osls に移して本番を確かめ、その後に SSR の Lambda を足す。移す作業と SSR を同じリリースにしない
- 計画: `docs/superpowers/plans/2026-10-24-web-delivery-to-osls.md`

## 13. 計画前の下調べ（2026-10-24）

コードを読んだ結果（ビルド・実行はしていない）。詳しい表は作業メモ（git 管理外）にある。

### 13.1 今の SSR の部品

- `ssr: false`・`prerender: false`。`app.routes.server.ts`（`RenderMode`）は無い
- `server.ts` は古い `CommonEngine` で、読み込んだだけで `listen` する。旧 `server` ターゲット（`angular.json`）も残っている。Angular 22 の `AngularNodeAppEngine` の形に書き直す
- `provideClientHydration(withNoIncrementalHydration())` だけで、`withEventReplay` は無い
- 題名は各ルートの固定の `data.title` だけ。駅名などは入らず、`Meta`（説明・OGP）を書くコードも無い。ダッシュボードには題名が無い → 5.1 は新しく作る

### 13.2 サーバーで壊れる・重くなるところと、決めた直し方

| 所 | 何が起きるか | 直し方 |
|---|---|---|
| Elf のストアはファイルの中で作った 1 つきり | Lambda の 1 つの実行環境は、前のリクエストのストアの中身を持ったまま次を描く | サーバーで描く前に、Elf の登録簿にある全ストアを `reset()` する |
| 1 秒・1 分ごとのタイマー（ダッシュボード・real-time・ダイヤグラム・列車位置情報） | zone.js でアプリが落ち着かず、SSR が終わらない | ブラウザでだけ張る |
| GA（`typeof gtag !== undefined` の書き誤りで常に真）・web-vitals の起動 | サーバーで `gtag`・`location` が無く落ちる | ブラウザでだけ動かす。書き誤りも直す |
| `localStorage` を同期で読むところ（列車位置情報のパネル・失効の窓） | サーバーで落ちる・毎回例外を作る | ブラウザでだけ読む |
| `initialDataResolver`（遷移のたびに 11 本前後・今日の運用と編成まで） | サーバーで毎回重い | サーバーでは要るものだけ取る。今日のもの・トークン以外のプロフィールは取らない |
| `maintenanceGuard` | メンテ中に描いた行き先が CDN に残る | サーバーでは通さない（ブラウザで判定） |
| 駅別・全線時刻表の、足りない param を足して `navigate` し直すところ | サーバーで描いている最中に移動する | サーバーでは足りない URL を足した URL へ 302 で返す（計画で形を決める） |
| 運用表の `@defer (on viewport)` | サーバーでは中身が描かれない | サーバーでも描かれる書き方にする |
| ストアの保存を戻す前後（全線時刻表・ダイヤグラムの畳み状態） | サーバーは既定の状態で描き、ブラウザは戻した後の状態で hydration するのでずれる | 戻した値で変わる部分はブラウザで起動した後に描く |

- サーバーから API を呼ぶときは Cookie を渡さない。トークンは匿名のものを取る（今の `TokenQuery` と同じ）

### 13.3 リリースの分け方

1. **SSR の下ごしらえ（client）**: 13.2 の直しだけ。`ssr: false` のまま出すので、利用者から見た動きは変わらない。手元で SSR を起動し、全ページがエラー無く描け、終わることを確かめる
2. **SSR を入れる（client）**: `app.routes.server.ts`・サーバーで取らない分け目・題名と OGP・`Cache-Control` とタグ・Lambda と配信（osls）・Service Worker の殻の確かめ（7.4）・圏外の保存（7.3）
3. **失効（api）**: タグの失効と、まとめ方。api の spec と ADR で
4. **温めと計測**: 6.4・10 章

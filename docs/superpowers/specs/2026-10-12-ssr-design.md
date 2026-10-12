# SSR の導入 設計

- 日付: 2026-10-12
- 対象: sotetsu-lab-v3-client / sotetsu-lab-v3-infrastructure
- 状態: 設計合意済み・spec レビュー待ち

## 1. 目的

次の 4 つをすべて満たす。

- A. 検索に載る（駅別時刻表・運用表・列車番号などのページが検索で出る）
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
- index.html にも 1 年のブラウザキャッシュが付いている（古い index.html をブラウザが持ち続ける恐れ）

### 2.3 Angular 22 の仕組み（angular.dev）

- ページごとに描き方を選べる（`app.routes.server.ts` の `RenderMode.Server` / `Prerender` / `Client`）
- HttpTransferCache: サーバーで取った GET の結果を HTML に埋め、ブラウザで取り直さない。`provideClientHydration` で標準で効く

### 2.4 置き場所の検討

- Cloudflare Workers: 公式の雛形（create-cloudflare の Angular 用）で Angular SSR が動く。無料プランは 1 リクエスト CPU 10ms まで（SSR には足りない見込み・未実測）、有料は月 $5。API が東京にあるので、利用者の近くで描く利点は日本の利用者には効きにくい。ドメインの付け替えも要る → 見送り
- 常時起動のサーバー（ECS・App Runner）: 誰も来なくても費用がかかる → 見送り
- Lambda@Edge: us-east-1・制限がきつい → 見送り
- **Lambda に決定**。寝起きは CDN に長く置き stale-while-revalidate で裏で描き直すことで、利用者がほぼ踏まないようにする（6 章）
- 配り方は **osls**（API と同じ。MIT・Serverless Framework v3 をもとにした版。2026-09-25 時点で手入れが続いている）。sls のライセンス問題は osls で避ける

## 3. 全体の形

```
ブラウザ ─→ CloudFront（Terraform）
              ├─ /api/*                         ─→ BFF（今のまま）
              ├─ JS・CSS・フォント・画像・assets/* ─→ S3（今のまま・長く置く）
              └─ それ以外（画面の URL）          ─→ SSR の Lambda（Function URL・OAC）
                                                  └─ API（v3）を呼んで描く
```

- SSR の Lambda: client に `serverless.ts` を置き、osls で配る。`@angular/ssr` の Node 用の仕組みを Lambda で動かす
- CloudFront: web モジュールに、Lambda の Function URL を配り元として足す。CloudFront からだけ呼べるように OAC で守る。既定の振り分けから `spa-routing` 関数を外す
- 配る手順: タグの push で、今の S3 同期・失効に加えて Lambda も配る

## 4. ページごとの描き方

分け目は「中身がどれくらいの速さで古くなるか」。

| 種類 | ページ | 描き方 | CDN |
|---|---|---|---|
| 改正のときにしか変わらない | 駅別時刻表・全線時刻表・運用表・運用行路図・列車ダイヤグラム・列車番号 | `Server`。中身まで描く | 長く置き、入力したら失効（6 章） |
| 刻々と変わる | ダッシュボード・real-time・列車位置情報 | `Server`。枠と題名・説明だけ描き、中身はブラウザで取る | 長く置く（枠と題名は変わらない） |
| 入力・ログインが要る | 列車情報の入力など | `Client` | `no-store` |

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
- 目撃のソケット・localStorage・`window` など、ブラウザにしかないものはサーバーで動かさない。2024 年の修正（22aeab90）が今も効いているか確かめ直す

### 5.3 ログイン状態

- HTML は CDN に置くので、**ログインしているかどうかで中身が変わるもの（管理者だけのボタンなど）はサーバーで描かない**。CDN に置いたものが別の人に見える事故を防ぐ
- 該当する箇所は計画のときに洗い出す

## 6. 速さ（ISR）

### 6.1 待たせない: stale-while-revalidate

- 中身まで描くページ・枠だけのページは `Cache-Control: s-maxage=…, stale-while-revalidate=…, stale-if-error=…` を返す（CloudFront は両方に対応している。AWS の文書で確認済み）
- 期限が切れても置いてある HTML をすぐ返し、描き直しは裏で行う。利用者が Lambda の寝起きを踏むのは、そのページを初めて描くときだけ
- 配り元が落ちても `stale-if-error` で古いページが出続ける
- stale を返せる長さは CloudFront の最大 TTL で頭打ちになるので、キャッシュポリシーの最大 TTL も合わせる
- ブラウザには長く置かない（`max-age` は短く）

### 6.2 長く置き、変わったときだけ捨てる: オンデマンドの描き直し

- 時刻表・運用表は改正か入力でしか変わらないので、`s-maxage` は長く（例 1 週間）
- 入力を保存したら、その範囲の CloudFront のキャッシュを失効させる（例 `/timetable/*`・`/operation/*`）。失効は API の書き込みの後か client の保存の後で行う（どちらにするかは計画で決める）
- 失効の無料枠・料金（ワイルドカードの数え方）は計画のときに AWS の文書で確かめる
- 失効のあとに描き直すとき、API 側の時刻表キャッシュ（1 時間）に古いものが残っていないこと

### 6.3 日本中で同じキャッシュを使う: Origin Shield（東京）

- CloudFront の Origin Shield を東京に置き、どの拠点も 1 つのキャッシュを見に行くようにして、Lambda を起こす回数を減らす

### 6.4 先に描いておく: 温め

- デプロイ・失効のあとに、主な駅の時刻表・運用表などを一通り開いて、キャッシュを満たしておく

### 6.5 Lambda を速くする

- メモリを多めに（CPU も増える）、arm64、API と同じ warmup プラグインで寝起きを減らす

### 6.6 古い版の JS・CSS を残す

- 古い HTML を返す以上、その HTML が読む古い版の JS・CSS が残っていなければならない。今の `aws s3 sync --delete` をやめ、古いファイルをしばらく残す配り方に変える（残す長さは、stale を返す最大の長さ以上）

## 7. PWA（圏外でも見られる）

### 7.1 今あるもの

- Service Worker（ngsw）が JS・CSS・index.html を先読みして保存し、2 回目以降の画面の URL には保存した index.html を返す（`navigationRequestStrategy` 既定の `performance`）
- ページのストアを localforage に保存しているのは 6 つ: ダッシュボード・運用表・列車ダイヤグラム・real-time・投稿カード・列車情報の入力の下書き
  - real-time は設定の 5 項目だけ（選んだ会社・運用群・自動更新など）。2026-07-17 のデザイン刷新（b4166a1f）で絞られた。理由は残っていない
  - 駅別時刻表・全線時刻表は何も保存していない
- Service Worker が `/api/**` の結果も保存している（freshness・`maxSize: 10`・`maxAge: 1d`・`timeout: 10s`）。駅別時刻表・全線時刻表の圏外での表示は、今はこれだけが頼り

### 7.2 SSR との役割分担

- 初めての人・検索エンジン・SNS のプレビューには SSR の HTML が届く（A・B・初回の C）
- 2 回目以降は Service Worker が保存した殻ですぐ起動する（`performance` を保つ。`freshness` にはしない。angular.dev も既定の `performance` を勧めている）
- 圏外でも、すべての URL で殻が起動すること

### 7.3 SSR で開く穴と、その手当て

- SSR で描いたページはデータを HTML に埋めて渡すので、ブラウザは API を叩かず、Service Worker の API の保存にも残らない。手当てをしないと、SSR で初めて開いた時刻表は圏外で出ない
- 手当て: **表示したデータをストアごと localforage に保存する**（ユーザー判断。「ストア全体保存は通信断用」の方針を広げる）
  - 新しく保存する: 駅別時刻表・全線時刻表
  - real-time も設定だけでなく、データごと保存に戻す（ユーザー判断）
  - そのほかの SSR で中身まで描くページ（運用行路図・列車番号）も、保存していなければ同じく保存する。どのページが当たるかは計画で洗い出す
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
- HTML は Lambda から来るので、index.html の 1 年キャッシュの問題（2.2）は自然に直る。S3 に残す静的ファイルは名前にハッシュが付くので 1 年のままでよい

## 9. 切り戻し

- 振り分けの既定先を S3＋`spa-routing` に戻せば今の形に戻る。Terraform の変数 1 つで切り替えられるようにする
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

# ADR-0017: SSR を Lambda（Web Adapter）で動かし、CloudFront の後ろに置く

- **日時**: 2026-10-28
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み
- **ブランチ**: feature/ssr-enable
- **関連**: 設計 `docs/superpowers/specs/2026-10-12-ssr-design.md`（14 章が本体。8・9 章）、計画 `docs/superpowers/plans/2026-10-27-ssr-enable.md`、ADR-0012（画面の配信を osls に）、ADR-0014（SSR の描き分けの決まり）、api ADR-0012（CDN の失効）

---

## 背景

- 2a で描き分け、2b で圏外の保存と Service Worker を入れた。2c は、本番の画面の URL を CloudFront から SSR の Lambda に流す段。
- 描いた HTML は大きい（運用表 10MB・ダイヤグラム 4.7MB など）。Lambda の応答は 6MB まで。
- 入力すると、API がタグ（`calendar:<id>` など）で CDN を失効させる（api リリース 3・v4.3.0・2026-10-27 に本番で確かめ済み）。だから HTML を 1 週間置ける。

## 決定

- **入口は Lambda Web Adapter（LWA）**。`server.ts`（Express）を Lambda の中で `listen` させる。本番も手元（`ssr:check`）も同じ道を通る。`/healthz` は LWA の起動確認。
  - 枠組みは Express のまま。手元で Fastify・Hono と比べた（2026-10-28・描いた後の HTML を同じ圧縮で返す台）。起動は Hono 86ms・Express 113ms・Fastify 160ms。応答は 3 つとも数 ms 差で、時間の大半は圧縮（zlib）だった。描画（手元で 0.3〜1.4 秒）の前では誤差なので、書き直す手間に見合わない。Hono の `compress` には br も無い。
- **圧縮は Express の `compression`**。br は品質 5、gzip は品質 6、`Vary: Accept-Encoding`。CloudFront は配信元の圧縮をそのまま置く。
- **Lambda は arm64・2048MB・20 秒・nodejs24.x、LWA は `LambdaAdapterLayerArm64:30`**（api は :23 のまま。揃えるのは別の機会）。`NODE_ENV=production`（Express の 500 がスタックを返さないため）。
  - warmup は入れない（ユーザー判断・2026-10-28）。寝起き（Init）は 293ms で、消せるのはそれだけ。HTML は CDN に置くので、Lambda が動くのは失効後の最初の 1 人だけ。5 分ごとに起こしても温かいのは 1 台だけ。効くのは失効後に先に描かせる温め（リリース 4）。
  - stg で比べた（2026-10-28）。x86_64・3008MB・V8 の若い世代を大きくする、のどれでも描画の時間は変わらなかった。描画は 1 本のスレッドで律速される。
- **Function URL は `AWS_IAM`、CloudFront は OAC で署名して呼ぶ**。許可は `lambda:InvokeFunctionUrl` と `lambda:InvokeFunction`（`InvokedViaFunctionUrl`）の 2 つで、どちらも配信の ARN に絞る。
- **キャッシュの鍵はパス（matrix param を含む）だけ**。Cookie・`Authorization`・クエリは鍵にも Lambda にも渡さない。
  - クエリを外したのはユーザー判断（2026-10-28）。SSR のページはクエリを読まない。SNS のリンクの `fbclid`・`utm_*` で鍵が割れると毎回描き直しになり、誰でもクエリを変えて Lambda を回せてしまう。
- **振り分け**: `/api/*` は BFF、`*.*` は S3、それ以外は Lambda（Origin Shield 東京）。SSR を入れているときは `DefaultRootObject` を付けない。付けると `/` が `/index.csr.html` に書き換わり、`*.*` で S3 の殻に行く。
- **`allowedHosts` は `*.lambda-url.ap-northeast-1.on.aws` と `localhost` だけ**。CloudFront は Function URL の名前を Host にして送る（stg で確かめた）。
- **殻への切り替えは `server.ts` が行う**（ユーザー判断・2026-10-28）。描いた HTML が 5MiB を超え、相手が br も gzip も受け付けないときは、Lambda に同梱した `index.csr.html` を `short` で返す。
  - spec はオリジングループと書いていた。だがオリジングループだと、S3 に元の画面のパスが届いて 403/404 になる。
  - 計画は配信の `CustomErrorResponses`（502〜504 → 殻）にした。だがこれは配信全体に効き、`/api/*`（BFF）の 5xx まで殻の 200 に化けるので、最終的に外した。
  - Lambda が落ちた・時間切れのときは CloudFront のエラーになる。CDN に置いてある分は `stale-if-error` で出続ける。
  - 運用表を軽くした後は、今あるページでこの切り替えが起きることは無い。守りとして残している。
- **運用表は、サーバーで最初の 8 枚だけ中身まで描く**（`SERVER_RENDERED_CARDS`。2026-10-28 に 4 枚へ改めた。ADR-0018）。残りはサーバーでは場所取りだけ返し、画面に入ったものからブラウザが描く。
  - 104 枚を全部描くと HTML が 10MB になり、スマホが読んで並べる間 2.3 秒操作が効かなかった（Lighthouse の TBT）。
  - 9 枚目からのカードは、検索には載らない。題名・説明・最初の 8 枚で足りるとした。
  - カードの記述は、`@defer` の 2 つの枝に重複して書いてある。`ngTemplateOutlet` で共通化すると、`@defer` の中で描かれなかったため。
- **CDN に置く長さは 1 週間（`long`）のまま**。失効（api リリース 3）を先に出したので、つなぎの短い値は使わない。
- **古いハッシュ付きの JS・CSS は消さない**。1 回目の `s3 sync` に `--delete` を付けない。デプロイ前に CDN に置かれていた HTML が、古い JS を読めるようにするため。溜まった分の掃除（S3 のライフサイクルなど）は、量が問題になってから決める。
- **デプロイの順**: ハッシュ付きのファイルを先に置く（バケットがあるときだけ）→ `osls deploy` → 2 回の `s3 sync` → `/*` の失効。同じ stage のデプロイは重ねない（`concurrency`）。

## 切り戻しと、本番の初回の出し方

- **切り戻し**: `gh workflow run deploy-on-push-version-tags.yml -f stage=prod -f ssr=off`。既定の振り分けが S3＋`spa-routing`（`index.csr.html` に寄せる）に戻り、`DefaultRootObject` も `index.csr.html` になる。Lambda・OAC・許可は残るので、`ssr=on` で流し直せばすぐ戻せる。
- **本番の初回は 2 段で出す**。許可（`AWS::Lambda::Permission`）は配信の ARN を参照するので、CloudFormation は配信の更新が済んでから許可を作る。初回でいきなり `ssr=on` にすると、振り分けが Lambda に向いてから許可ができるまでの数分間、全画面が 403 になる。
  1. リリースする ref で `-f stage=prod -f ssr=off` を流す。Lambda・URL・OAC・許可ができ、S3 に `index.csr.html` と新しいチャンクが入る。
  2. そのあとでタグを push する（`prod`・`on`）。差分は振り分けだけになる。
- 配備用のバケット（`<prefix>-sls-deployment-bucket`）は osls が作らない。新しい stage は先に手で作る。

## 結果

- stg（`sotetsu-lab-v3-stg-client-cfstack`）で spec 14.3 の 6 点が通った（spec 14.5）。
- Lighthouse（スマホの既定・CDN に置かれた状態・2 回ずつ・2026-10-28）で、本番の SPA と stg の SSR を比べた。中身が出るまで（Speed Index）は、どのページも SSR が 0.6〜0.9 秒早い。点数はほぼ同じになった。SPA の LCP 0.8 秒は骨組みを数えているので、点数は SPA に甘く出る。
  - トップ: SPA は点数 59・77、SI 3.0 秒、TBT 0.7〜1.1 秒。SSR は点数 77、SI 2.3〜2.5 秒、TBT 1.0〜1.1 秒
  - 運用表（最初の 8 枚だけ描く形）: SPA は点数 84、SI 3.1〜3.5 秒、TBT 0.6 秒。SSR は点数 81、SI 2.4 秒、TBT 0.55 秒
  - 駅別時刻表: SPA は点数 73、SI 2.7 秒、TBT 1.6〜1.7 秒。SSR は点数 71、SI 1.8〜1.9 秒、TBT 2.0〜2.1 秒
  - stg のドメインは API と BFF の CORS に通らない。そのため、Chrome の `--disable-web-security` で測った。通さずに測ると、メンテ確認が失敗してトップに飛び、数字が狂う（最初の計測はこれで狂っていた）。
- 遅いのは、CDN に HTML が無いときの最初の 1 人だけ。運用表で 4〜5 秒かかる。失効のあとに先に描かせる仕組み（温め）は、リリース 4 で入れる。

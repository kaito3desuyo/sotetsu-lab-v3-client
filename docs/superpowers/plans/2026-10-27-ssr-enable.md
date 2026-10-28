# SSR リリース 2c：Lambda と配信で SSR を有効にする Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 本番の画面の URL を、CloudFront から SSR の Lambda（Express の `server.ts`）に流し、サーバーで描いた HTML を CDN に置いて返す。

**Architecture:** 本番ビルドを SSR ビルドに替え、`server.ts` を Lambda Web Adapter（LWA）の上で `listen` させる。Lambda は Function URL（`AWS_IAM`）で受け、CloudFront は OAC で署名して呼ぶ。応答は Express の `compression` で br／gzip にしてから返す。拡張子のある URL と `/api/*` はこれまでどおり S3 と BFF に流す。Lambda が返せないとき（6MB 超・落ちた）は S3 の殻 `index.csr.html` を出す。SSR の入り切りは osls の stage param `ssr` 1 つで切り替える。本番の前に、別の stage `stg` で spec 14.3 の 6 点を試す。

**Tech Stack:** Angular 22.2（`@angular/ssr` の `AngularNodeAppEngine`）、Express、`compression`、osls 3.78（`serverless.ts`）、AWS Lambda（nodejs24.x・arm64）＋ Lambda Web Adapter レイヤー、CloudFront（OAC・Origin Shield・CacheTagConfig）、GitHub Actions。

**Spec:** `docs/superpowers/specs/2026-10-12-ssr-design.md`。14 章が本体。ほかに 6 章（ISR）、7.4（Service Worker の殻）、8 章（振り分け）、9 章（切り戻し）、10 章（確かめ方）を使う。

## Global Constraints

- Lambda の入口は LWA。本番も手元（`ssr:check`）も同じ Express の `server.ts` を通す。自前の `handle(Request)` の入口は作らない（spec 14.2）。
- 圧縮は Express の `compression` で行う。br は品質 5、gzip は品質 6 にし、`Vary: Accept-Encoding` を付ける。brotli の品質 11 は使わない（spec 14.1・14.2）。
- 描画を 1 本ずつにする列（`server.ts` の `renderQueue`）は残す（spec 14.2・ADR-0016）。
- Cookie と `Authorization` は、キャッシュの鍵にも Lambda にも渡さない。キャッシュの鍵は「パス（matrix param を含む）＋クエリ」だけにする（spec 8 章）。
- キャッシュポリシーの最小 TTL は 0、最大 TTL は 31536000 にする。Gzip・Brotli の正規化は有効にする（spec 14.4）。
- キャッシュタグのヘッダー名は `Cache-Tag`（`src/app/core/ssr/cache-control.ts` の `CACHE_TAG_HEADER`）。CloudFront の `CacheTagConfig.HeaderName` も同じにする。
- OAC で Function URL を守るときは、`lambda:InvokeFunctionUrl` と `lambda:InvokeFunction`（`InvokedViaFunctionUrl: true`）の 2 つの許可を付ける（spec 14.4）。
- Origin Shield は東京（`ap-northeast-1`）に置く（spec 6.3）。
- 配信の論理 ID `AppCloudFrontDistribution` は変えない。変えると DNS の向き先が消える（`serverless.ts` の注記）。
- 本番の別名 `v3.sotetsu-lab.com` は stage `prod` のときだけ付ける。`stg` は CloudFront の既定のドメインで試す。
- 古い版の JS・CSS は消さない。名前にハッシュの付くファイルの `aws s3 sync` から `--delete` を外す（spec 6.6）。
- コミットは Conventional Commits＋絵文字にし、本文は日本語で書く。署名つきで、サンドボックスの外でコミットする。
- コマンド（Node 24）:
  - jest は `PATH=/home/seapolis/.local/share/mise/installs/node/24.22.0/bin:$PATH MISE_DISABLE_TOOLS=node node node_modules/jest/bin/jest.js --testPathPatterns=<パス>` で回す。
  - build・`ssr:check`・`osls package` は、サンドボックスの外で回す。
- パイプでコマンドをつながない。素の `git stash` は使わない。
- AWS に書き込む操作（`osls deploy`・`aws` の変更系）は手元では打たない。GitHub Actions の `workflow_dispatch` で流し、流す前にユーザーの許可を取る。

## Review Focus

1. **`Accept-Encoding` が無い相手に、6MB を超える HTML を返す。** curl や古い bot が運用表（9〜10MB）を開いても、殻の HTML が 200 で返るべきだ。→ Task 6 の試し 2 で押さえる。
2. **ログインした人の Cookie が付いたまま開く。** その人の状態が HTML に入って CDN に置かれ、ほかの人に見えてはいけない。→ Task 4 の template の確かめで、Cookie・`Authorization` が鍵にも Lambda への転送にも入らないことを押さえる。Task 6 では、Cookie を付けて開いた応答と付けずに開いた応答が同じ HTML であることを確かめる。
3. **デプロイの直後に、CDN に残った古い HTML が開かれる。** その HTML が読む古い JS・CSS が S3 に残っていなければ、画面が真っ白になる。→ Task 5 で `--delete` を外す。Task 7 で、デプロイ前の HTML から読まれる JS がデプロイ後も 200 で返ることを確かめる。
4. **2 回目以降の訪問（Service Worker が殻を返す）。** SSR に替わっても、Service Worker の殻からすぐ起動し、新しい版の知らせ（`app-update.service.ts`）も効くべきだ。→ Task 2 で ngsw の `index` と殻の名前をそろえる。Task 7 で、再訪と圏外を実地で確かめる。
5. **Lambda の寝起きと、`listen` 前の要求。** 最初の要求が寝起き中に来ても、エラーではなく描いた HTML が返るべきだ。→ Task 1 で LWA の準備確認用に `/healthz` を作る。Task 6 の試し 6 で寝起きの長さを測る。

---

## ファイルの地図

- 変える
  - `server.ts`: 圧縮、`/healthz`、LWA の非 HTTP イベントの受け口
  - `angular.json`: 本番を SSR ビルドにし、`allowedHosts` を設定する。`ssr-check` の構成は消す
  - `package.json`: `compression`・`@types/compression`・`serverless-plugin-warmup` を加え、`build:ssr-check` を書き換える
  - `ngsw-config.json`: `index` と殻の名前を変える。`src/ngsw-config.spec.ts` も直す
  - `cloudfront/spa-routing.js`: 寄せる先を `index.csr.html` にする
  - `serverless.ts`: Lambda、Function URL、OAC、許可、キャッシュポリシー、振り分け、Origin Shield、CacheTagConfig、エラー時の殻、stage param
  - `.github/workflows/deploy-on-push-version-tags.yml`: stage の入力、Lambda の配置、`--delete` を外す
  - `scripts/ssr-check.mjs`: 圧縮と `/healthz` の確かめを足し、本番ビルドを読むようにする
- 作る
  - `lambda/run.sh`: LWA から起こされる起動スクリプト
  - `scripts/check-cfn-template.mjs`: `osls package` の出力を確かめる
- 文書
  - spec 14 章に試しの結果を足す
  - `docs/adr/0017-ssr-on-lambda.md`（新規）
  - `CLAUDE.md` の「SSR 設定は存在するが無効（`ssr: false`）」の行

---

### Task 1: `server.ts` に圧縮と Lambda 用の受け口を足す

**Files:**
- Modify: `server.ts`、`package.json`、`scripts/ssr-check.mjs`

**Interfaces:**
- Produces:
  - `GET /healthz` は 200 で本文 `ok` を返す。キャッシュはさせない（`Cache-Control: no-store`）。Angular に渡す前に答える。
  - `POST /events` は 204 を返す。LWA は、warmup などの HTTP でないイベントをここに送る（LWA の既定の `AWS_LWA_PASS_THROUGH_PATH`）。
  - 描いた HTML は、`Accept-Encoding` に `br` があれば br（品質 5）で返す。`gzip` だけなら gzip（品質 6）で返す。どちらも無ければ圧縮しない。1KB 未満は圧縮しない。

- [ ] **Step 1: `ssr:check` に、落ちる確かめを足す**
  - 各 `server` の行で、`Accept-Encoding: br, gzip` を付けて取り、`Content-Encoding: br` と、`Vary` に `Accept-Encoding` を含むことを見る。
  - 運用表（`/operation/table;calendar_id=…`）を `Accept-Encoding: gzip` で取り、`Content-Encoding: gzip` を見る。同じ URL を `identity` で取り、`Content-Encoding` が無いことを見る。
  - `/healthz` が 200・`ok`・`no-store` であること、`POST /events` が 204 であることを見る。
  - `fetch` は自分で解凍するので、本文の検査は今のままでよい。
- [ ] **Step 2: `npm run build:ssr-check` → `npm run ssr:check` を回し、足した確かめが FAIL になることを見る**
- [ ] **Step 3: 実装する**
  - `npm install compression` と `npm install -D @types/compression` を、サンドボックスの外で打つ。
  - `server.ts` の `express.static` の前に `/healthz` と `POST /events` を置き、その次に `compression({ threshold: 1024, level: 6, brotli: { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } } })` を置く。
  - `compression` が brotli を出せない版なら、gzip だけにして報告する。spec 14.3 の 1 だ。
- [ ] **Step 4: もう一度回し、全部 OK になることを見る**（`OK` の数を報告に書く）
- [ ] **Step 5: コミットする**: `feat: :sparkles: SSR の応答を圧縮し、Lambda 用の受け口を足す`

### Task 2: 本番ビルドを SSR ビルドにし、殻の名前をそろえる

**Files:**
- Modify: `angular.json`、`package.json`（`build:ssr-check`）、`ngsw-config.json`、`src/ngsw-config.spec.ts`、`cloudfront/spa-routing.js`、`scripts/ssr-check.mjs`、`CLAUDE.md`（1 行）

**Interfaces:**
- Produces:
  - `npm run build:prod` の出力は `browser/`（`index.csr.html` を含み、`index.html` は無い）と `server/server.mjs` になる。
  - Service Worker の殻は `/index.csr.html`。

- [ ] **Step 1: `src/ngsw-config.spec.ts` に、落ちる確かめを足す**
  - `index` が `/index.csr.html` であること。
  - `app` の資源の `files` に `/index.csr.html` があり、`/index.html` が無いこと。
- [ ] **Step 2: jest でその spec が FAIL になることを見る**
- [ ] **Step 3: 実装する**
  - `angular.json` の `production` 構成に、`"outputMode": "server"`、`"ssr": { "entry": "server.ts" }`、`"security": { "allowedHosts": ["v3.sotetsu-lab.com", "*.cloudfront.net", "*.lambda-url.ap-northeast-1.on.aws", "localhost"] }` を足す。
    - `allowedHosts` の中身は Task 6 の試し 5 で詰める。
    - `ssr-check` の構成は消す。`build:ssr-check` は `ng build -c production` にする。
  - `ngsw-config.json` を Step 1 のとおりに直す。
  - `spa-routing.js` の寄せる先を `index.csr.html` にする。切り戻しのときと、殻の切り替えのときに使う。
  - `ssr-check.mjs` を `build:ssr-check` の出力に合わせる。Task 1 と同じ `dist/sotetsu-lab-v3-client/server/server.mjs` だ。
  - `CLAUDE.md` の「SSR 設定は存在するが無効（`ssr: false`）」の行を、「本番は SSR（Lambda）。描き方は `app.routes.server.ts`」に直す。
- [ ] **Step 4: 確かめる**
  - jest の `src/ngsw-config.spec.ts` が通ること。
  - `npm run build:prod` のあとで、`browser/index.csr.html` があって `browser/index.html` が無いこと、`browser/ngsw.json` の `index` が `/index.csr.html` であること、`server/server.mjs` があること。
  - `npm run ssr:check` が全部 OK になること。
- [ ] **Step 5: 依存を持たずに起動できるかを確かめる**
  - `server/` だけを `.context/ssr-enable/pkg/` に写し、`node_modules` の無い所で `PORT=8080 node server/server.mjs` を起動する。
  - `/healthz` が 200 を返し、`/` が描けることを見る。
  - 落ちたら、足りない依存の名前を報告に書く。Task 4 の `package.patterns` に足すことになる。
- [ ] **Step 6: コミットする**: `build: :package: 本番ビルドを SSR にし、Service Worker の殻を index.csr.html にする`

### Task 3: CDN に置く長さ（作業なし・決定の記録）

`long` は 1 週間（`s-maxage=604800`）のまま変えない。2026-10-27 にユーザーが決めた。理由は、API の失効（リリース 3・api リポジトリ）を先に出すからだ。つなぎの短い値は使わない。この判断により、Task 7 の本番リリースは、リリース 3 が本番に出たあとにしかできない。

### Task 4: `serverless.ts` に SSR の Lambda と振り分けを書く

**Files:**
- Create: `lambda/run.sh`、`scripts/check-cfn-template.mjs`
- Modify: `serverless.ts`、`package.json`（`serverless-plugin-warmup`）

**Interfaces:**
- Consumes: Task 2 の `dist/build-by-ci/{browser,server}`（CI の出力先）と、Task 1 の `/healthz`・`/events`。
- Produces:
  - stage param は `ssr`（`'on' | 'off'`）。`prod` と `stg` の既定は `'on'`。`--param="ssr=off"` で切り戻す。
  - 別名は param `aliases` で渡す。`prod` は `v3.sotetsu-lab.com`、`stg` は無し。
  - Outputs に `SsrFunctionUrl` を足す。今の `WebBucketName` と `WebDistributionId` はそのまま残す。

- [ ] **Step 1: `scripts/check-cfn-template.mjs` を書く**
  - `.serverless/cloudformation-template-update-stack.json` を読み、次を確かめる。1 つでも外れたら 1 で終わる。
  - Lambda:
    - `Runtime: nodejs24.x`、`Architectures: [arm64]`、`MemorySize: 2048`、`Timeout: 20`。
    - レイヤーに `LambdaAdapterLayerArm64` を含む。
    - 環境変数は `AWS_LAMBDA_EXEC_WRAPPER=/opt/bootstrap`、`AWS_LWA_PORT=8080`、`AWS_LWA_READINESS_CHECK_PATH=/healthz`。
  - Function URL:
    - `AuthType: AWS_IAM`、`InvokeMode: BUFFERED`。
  - 許可:
    - `AWS::Lambda::Permission` が 2 つある。1 つは `lambda:InvokeFunctionUrl` と `FunctionUrlAuthType: AWS_IAM`、もう 1 つは `lambda:InvokeFunction` と `InvokedViaFunctionUrl: true`。
    - どちらも `Principal: cloudfront.amazonaws.com`、`SourceArn` は配信の ARN。
  - OAC: `OriginAccessControlOriginType: lambda`。
  - キャッシュポリシー:
    - `MinTTL: 0`、`MaxTTL: 31536000`、`DefaultTTL: 0`。
    - `EnableAcceptEncodingGzip` と `EnableAcceptEncodingBrotli` は true。
    - `CookiesConfig` と `HeadersConfig` は `none`、`QueryStringsConfig` は `all`。
  - ssr=on のときの振り分け:
    - 既定の振り分けは、Lambda の配り元（Origin Shield `ap-northeast-1`）に送り、上のポリシーを使う。OriginRequestPolicy は付けない（Cookie と Authorization を送らないため）。関数の関連付けも無い。
    - `*.*` は S3 の配り元に送り、Managed-CachingOptimized を使う。
    - `/api/*` は今のまま。
  - `CacheTagConfig.HeaderName` は `Cache-Tag`。
  - `CustomErrorResponses` は 502・503・504 を `/index.csr.html`・200・`ErrorCachingMinTTL: 10` にする（下の Step 3 の注を見よ）。
  - ssr=off のとき: 既定の振り分けは S3 と `spa-routing` に戻り、`DefaultRootObject` は `index.csr.html` になる。
  - stage `stg` には `Aliases` と `ViewerCertificate` の ACM が無い。`prod` には別名が付く。
- [ ] **Step 2: `npx osls package --stage stg` → `node scripts/check-cfn-template.mjs` を回し、FAIL を見る**
  - サンドボックスの外で回す。AWS の認証は要らない。要るようなら止めて報告する。
- [ ] **Step 3: 実装する**
  - `lambda/run.sh`:
    ```sh
    #!/bin/sh
    export TZ=Asia/Tokyo
    exec node server/server.mjs
    ```
    - 実行権を付けてコミットする。
  - `serverless.ts`:
    - `functions.ssr` を置く。
      - `handler: lambda/run.sh`、`runtime: nodejs24.x`、`architecture: arm64`、`memorySize: 2048`、`timeout: 20`。
      - `layers` は `arn:aws:lambda:ap-northeast-1:753240598075:layer:LambdaAdapterLayerArm64:<最新>`。版の数字は awslabs/aws-lambda-web-adapter の README から取り、出典を報告に書く。
      - `environment` に Step 1 の 3 つと `PORT=8080` を入れる。
      - `url: { authorizer: 'aws_iam' }`。
      - `package.patterns` は `!**`、`lambda/run.sh`、`dist/build-by-ci/server/**` の 3 つ。
      - `run.sh` の中の `server/` は、パッケージの中の配置に合わせる。osls の `package.individually` か、run.sh で `cd` するかを選び、選んだ方を報告に書く。
    - `warmup` は `serverless-plugin-warmup` で、5 分ごとに並列 1。api の `serverless.ts` と同じ書き方にそろえる。
    - Lambda 用の OAC、許可 2 つ、キャッシュポリシー、配り元、振り分けを Step 1 のとおりに書く。
    - 殻の切り替えについて:
      - spec 9・14.2 はオリジングループと書いている。ただ、オリジングループで S3 に切り替わっても、S3 に届くのは元の画面のパスだ。S3 には殻しか無いので、そのパスでは 403 か 404 になる。
      - そこで、配信の `CustomErrorResponses` で 502・503・504 を `/index.csr.html` に差し替える。`/index.csr.html` は `*.*` の振り分けで S3 から取られる。
      - これで spec の「S3 の殻に切り替える」という目的は同じに果たせる。ADR-0017 にこの理由を書く。
      - オリジングループでもパスを直せる方法が Task 6 で見つかっても、こちらを使う。
    - ssr=off のときは、既定の振り分けを今のもの（S3 と `spa-routing`）にする。`Fn::If` と `Conditions` で切り替えるか、TypeScript の三項で組むかを選ぶ。選んだ方を報告に書く。
- [ ] **Step 4: `ssr=on` と `ssr=off`、`prod` と `stg` の 4 通りで package して確かめ、全部 OK になることを見る**
  - `--param="ssr=off"` で切り替える。
- [ ] **Step 5: コミットする**: `feat: :sparkles: SSR の Lambda と CloudFront の振り分けを serverless.ts に書く`

### Task 5: デプロイのワークフロー

**Files:** Modify: `.github/workflows/deploy-on-push-version-tags.yml`

- [ ] **Step 1: 実装する**
  - `workflow_dispatch` に入力を 2 つ足す。`stage` は `prod` か `stg` で、既定は `prod`。`ssr` は `on` か `off` で、既定は `on`。
  - タグの push のときは、`prod` と `on` を使う。
  - `npx osls deploy --stage "$STAGE" --param="ssr=$SSR"`。
  - スタック名を `sotetsu-lab-v3-$STAGE-client-cfstack` にする。
  - ハッシュの付くファイルの `s3 sync` から `--delete` を外す。2 回目（ハッシュの無いファイル）は `--delete` のままにする。2 回目は除外したファイルを消さない（`aws s3 sync` の仕様）ので、古いハッシュのファイルは残る。
  - `create-invalidation '/*'` は残す。SSR の HTML も入れ替えるためだ。
  - Lambda に配る `server/` が `osls deploy` より前にできているように、ビルドの段の順を確かめる。
- [ ] **Step 2: 確かめる**
  - `npx --yes @action-validator/cli .github/workflows/deploy-on-push-version-tags.yml` か、`actionlint` があればそちらで、書式を確かめる。
  - 道具が無ければ、YAML として読めることだけを `node -e` で確かめ、その旨を報告に書く。
- [ ] **Step 3: コミットする**: `ci: :construction_worker: stage と SSR の入り切りを選んでデプロイできるようにする`

### Task 6: stg で spec 14.3 の 6 点を試す（コントローラーとユーザー）

AWS に `sotetsu-lab-v3-stg-client-cfstack` を作る。ユーザーの許可を取ってから、`gh workflow run deploy-on-push-version-tags.yml --ref feature/ssr-enable -f stage=stg -f ssr=on` で流す。

- [ ] **Step 1:** デプロイが通ったら、Outputs から配信のドメインを読む。
- [ ] **Step 2: 6 点を試し、結果を `.context/ssr-enable/2c-trials.md` に書く**
  1. br と gzip が返るか。運用表を、`curl -sI -H 'Accept-Encoding: br'` と `-H 'Accept-Encoding: gzip'` で取る。
  2. `Accept-Encoding: identity` で運用表を取り、200 で殻が返るか。Lambda のログに 6MB 超のエラーが出ているかも見る。
  3. `Cache-Tag` が効くか。運用表を 2 回取り、2 回目が `x-cache: Hit` になることを見る。そのあと `aws cloudfront create-invalidation --paths '#calendar:<id>'` で失効させ、3 回目が `Miss` になることを見る。この失効はユーザーの `!` で流す。
  4. matrix param の `;` が Express まで届くか。駅別時刻表の題名に駅名が入っていることで見る。
  5. Lambda に届く Host と `allowedHosts`。400 にならないことを見る。ならない最小の組み合わせに `angular.json` を詰める。
  6. 寝起きの長さ。Lambda のログの `Init Duration` と、最初の要求の時間を見る。
- [ ] **Step 3: Cookie を付けても同じ HTML か**
  - `-H 'Cookie: sb-access-token=dummy'` を付けた応答と付けない応答で、HTML が同じかを見る。CDN を通らない Function URL は直接は叩けないので、CDN 越しに `x-cache` が Hit の同じ鍵になることで見る。
- [ ] **Step 4:** 試しの結果で決まったこと（`allowedHosts`、brotli の可否など）を直してコミットし、stg に流し直して確かめる。
- [ ] **Step 5:** spec 14 章に「14.5 stg で試した結果（日付）」を足し、コミットする: `docs: :memo: 2c の試しの結果を spec に書く`

### Task 7: 本番に出し、spec 10 章で確かめる（コントローラーとユーザー）

- [ ] **Step 0: 前提を確かめる**
  - api のリリース 3（`Cache-Tag` の失効）が本番に出ていること。出ていなければ、ここで止める。
    - 済み（2026-10-27）。api PR #197 を v4.3.0 で出した。
    - 本番で列車情報を更新すると、配信 `EOE7HW33MVGR6` に `#calendar:<id>` の失効が作られ、`Completed` になった。`CacheTagConfig` がまだ無い配信でも受け付けられた。
    - 警告は 0 件。Duration の最大は 1,043ms だった。
    - 2c を出したあとは、タグが付いた HTML が実際に消えるか（`x-cache` が Miss に戻るか）を Step 4 で確かめる。
  - Task 6 の試し 3 で、API の失効が stg の配信に効くことを確かめてあること。
- [ ] **Step 1: 出す前の計測**
  - 本番（CSR）で、スマホの幅と速度を真似て、駅別時刻表・運用表・real-time・ダッシュボードの「開いてから中身が出るまで」を測る。
  - 手順は memory の Lighthouse の手順に従う。結果は `.context/ssr-enable/before.md` に書く。
- [ ] **Step 2: ADR-0017 と文書**
  - `docs/adr/0017-ssr-on-lambda.md` を書く。中身は次のとおり。
    - LWA を選んだわけ
    - Express の中で圧縮するわけ
    - 殻への切り替えをエラーページにしたわけ（Task 4 Step 3）
    - stage param `ssr` での切り戻しの手順
    - 失効（リリース 3）を先に出したので、`long` は 1 週間のまま（Task 3）
  - コミットする: `docs: :memo: SSR を Lambda で動かす決めごとを ADR に書く`
- [ ] **Step 3:** PR を作ってマージする（ユーザー）。版は minor にする。タグの push でデプロイされる。
- [ ] **Step 4: 本番で確かめる（spec 10 章）**
  - 主なページの HTML に `ng-server-context` があること。
  - 2 回目は `x-cache: Hit` になり、ブラウザが同じ API を取り直していないこと。HttpTransferCache が効いているかをネットワークの記録で見る。
  - デプロイ前の HTML が読む JS が、デプロイ後も 200 で返ること。
  - 再訪で殻から起動し、圏外でも中身が出ること（2b と同じ手順）。
  - ログインして開いたページを、別の context で開いても、ログインの表示が出ないこと。
  - Step 1 と同じ計測をして、前後を `.context/ssr-enable/after.md` に並べる。
  - Discord・X のプレビューと Search Console は、ユーザーに頼む。
- [ ] **Step 5: stg の後始末**
  - stg のスタックを消すかどうかをユーザーに聞く。消すなら `osls remove --stage stg` を workflow から流す。S3 のバケットは `Retain` なので、別に消す。
- [ ] **Step 6:** 切り戻しが要るときは、`gh workflow run … -f stage=prod -f ssr=off` で戻す。手順は ADR-0017 に書いたとおりにする。

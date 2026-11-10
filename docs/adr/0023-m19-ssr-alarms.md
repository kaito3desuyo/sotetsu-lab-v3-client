# ADR-0023: SSR の Lambda のアラームを client のスタックに置く（M19）

- **日時**: 2026-11-10
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み
- **ブランチ**: feature/m19-monitoring
- **関連**: spec `docs/superpowers/specs/2026-11-10-m19-monitoring-design.md`、計画 `docs/superpowers/plans/2026-11-10-m19-monitoring.md`、ADR-0017（SSR on Lambda）、monitoring リポの ADR-0001（見張りの共通部分は CDK、アラームはアプリ側）、api リポの ADR-0016（同じ形のアラーム）

---

## 背景

- 本番の Lambda が壊れても、誰も気づけなかった。M19 で、本番の Lambda の故障を Discord に流す。受け口（SNS トピック → Discord 転送 Lambda）は monitoring リポが持ち、アラームは各アプリのリポに置く。
- SSR の Lambda が落ちる・時間切れになると、CloudFront のエラーがそのまま利用者に見える（`CustomErrorResponses` は付けていない。ADR-0017）。30 日（10/11〜11/10）の実測では、Errors 0・5xx 0。

## 決定

- 本番の `sotetsu-lab-v3-prod-client-ssr-lambda` にアラームを 2 本掛ける。
  - `sotetsu-lab-v3-prod-client-ssr-url5xx`：`Url5xxCount` が 1 時間に 5 件以上
  - `sotetsu-lab-v3-prod-client-ssr-errors`：`Errors` が 1 時間に 3 件以上（タイムアウトを含む）
- 共通のきまり：`Period: 3600`・`EvaluationPeriods: 1`・`Statistic: Sum`・`GreaterThanOrEqualToThreshold`・`TreatMissingData: notBreaching`。`AlarmActions` と `OKActions` に SNS。
- アラームを組むのは `serverless-alarms.ts`（api と同じ中身を複製。4 リポで同じ）。`serverless.ts` の `resources` に混ぜ、今ある `Conditions`（`SsrOn`・`HasAliases`）の隣に `IsProd`（`${sls:stage}` が `prod`）を足す。stg のスタックには作らない。
- SNS の ARN は `${ssm:sotetsu-lab-v3-${sls:stage}-monitoring-alarm-topic-arn, ''}` でデプロイ時に読む。デプロイの順番は monitoring → client。
- ブラウザのエラー（`page_load_error` など）は Discord に流さない（ユーザー決定）。GA で見る。
- `ssr=off` に切り戻しても SSR の Lambda は残るので、アラームはそのまま置く（呼ばれないので鳴らない）。

## 確かめたこと

- `npx osls package --stage prod` のテンプレートに、2 本のアラーム（`Ref` の先 `SsrLambdaFunction` が実在・送り先は monitoring のトピック）と、`IsProd`・`SsrOn`・`HasAliases`、`SsrLambdaFunctionUrl` の `InvokeMode: BUFFERED` がある。
- `--stage stg` では `IsProd` が `["stg","prod"]` で false になり、アラームは作られない。stg には SSM のパラメータが無く ARN は `''` になるが、作られないので害は無い。

## 結果

- SSR が続けて落ちると、1 時間以内に Discord に「🔴 障害発生」が届く。
- 関数のキー `ssr` を変えると `Ref` の先が無くなり、デプロイが CloudFormation で落ちる（黙って空振りしない）。

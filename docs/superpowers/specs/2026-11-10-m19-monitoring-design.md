# M19 障害の見張り（client の SSR の分）設計

2026-11-10。全体の形・実測・決まったことは monitoring リポの `docs/superpowers/specs/2026-11-10-m19-monitoring-design.md` にある。ここには client の SSR の Lambda に掛けるアラームだけを書く。

client の M19 のもう半分（`page_load_error` の `[object Object]`、`calendarId=undefined` の送信、デプロイ後の古い chunk の読み込み失敗）は、この設計に含めない。別に詰める。ブラウザのエラーは Discord に流さない（ユーザー決定）。

## やること

- 本番の `sotetsu-lab-v3-prod-client-ssr-lambda` にアラームを 2 本足す（`serverless.ts` の `resources`）。
  - `Url5xxCount`：1 時間に 5 件以上
  - `Errors`：1 時間に 3 件以上
- 共通のきまり（1 時間・Sum・`notBreaching`・`AlarmActions` と `OKActions` に SNS）は monitoring の設計に従う。
- client には stg のスタック（`sotetsu-lab-v3-stg-client-ssr-lambda`）もあるので、アラームは prod だけに作る。今ある `Conditions`（`SsrOn`・`HasAliases`）と同じやり方で、stage の Condition を足す。
- SNS トピックの ARN は `${ssm:...}` で読む。読むのは stage が `prod` のときだけにする（2026-11-10 の読み合わせで決めた）。monitoring は stg 向けのパラメータを作らない。
- 30 日の実測では、SSR は Errors 0、5xx 0。

## 終わりの条件

- `aws cloudwatch set-alarm-state` で 2 本とも ALARM・OK を切り替え、Discord に届く。
- stg のスタックにアラームが作られない。

## ADR

`docs/adr/` に「アラームを client のスタックに置く」を残す。

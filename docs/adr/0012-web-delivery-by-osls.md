# ADR-0012: 画面の配信（S3・CloudFront）を Terraform から client の osls に移す

- **日時**: 2026-10-24
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み
- **ブランチ**: build/web-delivery-osls
- **関連**: SSR の設計 `docs/superpowers/specs/2026-10-12-ssr-design.md`（3・9・12 章）、計画 `docs/superpowers/plans/2026-10-24-web-delivery-to-osls.md`（どちらも feature/ssr ブランチ）

---

## 背景

- `v3.sotetsu-lab.com` の配信（S3 バケット・CloudFront・OAC・GitHub Actions の secret 2 つ）は、infrastructure リポの Terraform（`modules/web`）にあった。一方で API の配信（`api.sotetsu-lab.com`）は、api の `serverless.ts` の `resources` に CloudFormation で書いてある。
- SSR（ロードマップ M2）では Lambda を配り元に足す。Lambda を osls、配信を Terraform で作ると、配信は Lambda の Function URL を、Lambda の呼び出しの許可は配信の ARN を待つことになり、道具をまたいで値を受け渡す必要がある。
- ユーザーが、画面の配信は Terraform をやめて osls に寄せると決めた（2026-10-24）。範囲は web モジュールだけで、network・database・api のモジュールは Terraform に残す。
- AWS を読んで分かったこと（2026-10-24）
  - Route 53 の `v3.sotetsu-lab.com` は、Terraform の配信 `E5C8TB9HLVQF9` ではなく、2024 年の SSR で作った配信 `EOE7HW33MVGR6`（別名 `*.sotetsu-lab.com`）を指している。CloudFront は Host で配信を選ぶので、ちょうど一致する別名を持つ `E5C8TB9HLVQF9` が答えている。
  - `EOE7HW33MVGR6` は、client の osls のスタック `sotetsu-lab-v3-prod-client-cfstack` の `AppCloudFrontDistribution`。同じスタックに 2024 年の SSR の Lambda 一式が残っている。`serverless.ts` は履歴をまとめたときに消えている。
  - `spa-routing` 関数は手で作ったもので、Terraform は ARN を直書きで参照していた。

## 決定

- client に `serverless.ts` を置き、2024 年のスタック `sotetsu-lab-v3-prod-client-cfstack` を上書きする。service 名・スタック名・配置用バケットは 2024 年と同じ値にする。
- 配信は論理 ID `AppCloudFrontDistribution` のまま使い回し、配り元を S3＋BFF（`/api/*`）・`spa-routing` 付きに変える。今の本番 `E5C8TB9HLVQF9` と同じ形。論理 ID を変えると配信が作り直され、DNS の向き先が消える。
- S3 バケットは新しく作る（`sotetsu-lab-v3-prod-client-web-bucket`）。配信とバケットには `DeletionPolicy: Retain` を付ける。
- `spa-routing` は `cloudfront/spa-routing.js` に写し、`AWS::CloudFront::Function`（`cloudfront-js-2.0`）としてスタックに書く。手で作った関数と名前がぶつからないよう、名前は `sotetsu-lab-v3-prod-client-spa-routing`。
- 2024 年の Lambda・Function URL・Lambda 用の OAC・キャッシュポリシー・層は、テンプレートから外して消す。
- バケットポリシーの配信の ARN は、osls の `${aws:accountId}` でなく `Fn::Sub` の `${AWS::AccountId}` で組む。osls の変数は package の時点で STS を呼ぶので、手元で認証なしにテンプレートを作れなくなる。
- 切り替えは、`E5C8TB9HLVQF9` から別名 `v3.sotetsu-lab.com` を外すだけ。DNS はもともと `EOE7HW33MVGR6` を指しているので、ワイルドカードの別名でそちらが答える。DNS は変えない。その後に別名を `v3.sotetsu-lab.com` だけにする。
- デプロイのワークフローは、バケット名と配信 ID を GitHub の secret でなくスタックの Outputs（`WebBucketName`・`WebDistributionId`）から読む。

見送った案。

- 新しい配信を作り、別名を `associate-alias`／`update-domain-association` で移す。同じアカウントの中なら TXT レコード無しで移せるが、DNS の向き先を書き換える手間が増える。今の DNS がすでに 2024 年の配信を指しているので、使い回すほうが短い。
- 今の配信とバケットを CloudFormation のリソースの取り込みで osls のスタックに入れる。osls に取り込みの機能が無く、手で変更セットを作る必要がある。
- Terraform に残し、SSR の Lambda の URL を変数で受け取る。道具をまたいだ値の受け渡しが残り、ユーザーの「Terraform をやめたい」に沿わない。

## 影響

- 配信を変えるときは client の PR で行い、タグの push で `osls deploy` が流れる。
- Terraform の web モジュール・GitHub の secret `DEPLOY_BUCKET_NAME`・`CLOUDFRONT_DISTRIBUTION_ID`・手で作った `spa-routing`・古い配信とバケットは、切り替えの 1 週間後に片付ける。
- 手元で `osls package` を流すときは、サンドボックスでは `~/.serverless` が読み取り専用なので HOME を差し替える必要がある。
- SSR の Lambda は、このスタックに足す（M2）。配り元の URL と呼び出しの許可は同じスタックの中で `Ref`・`Fn::GetAtt` で参照できる。

出典: AWS「Move an alternate domain name」（https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/alternate-domain-names-move-options.html）

# 画面の配信を Terraform から osls に移す 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `v3.sotetsu-lab.com` の配信（S3・CloudFront・OAC・`spa-routing`）を Terraform から client の osls に移す。SSR はまだ入れず、利用者から見た動きは今と同じにする。

**Architecture:** 2024 年の SSR で作り、DNS がすでに向いている osls のスタック `sotetsu-lab-v3-prod-client-cfstack` を、新しい `serverless.ts` で上書きする。中身は S3＋BFF＋`spa-routing` の配信で、今の本番の配信 `E5C8TB9HLVQF9` と同じ形にする。切り替えは `E5C8TB9HLVQF9` から別名を外すだけで済み、DNS は変えない。最後に Terraform の web モジュールを外す。

**Tech Stack:** osls 3.x（`serverless.ts`）・CloudFormation・CloudFront Functions（`cloudfront-js-2.0`）・GitHub Actions・Terraform（外すだけ）

**Spec:** `docs/superpowers/specs/2026-10-12-ssr-design.md` の 3 章・9 章・12 章（特に 12.2 章）

## Global Constraints

- AWS アカウント `442730633672`、リージョン `ap-northeast-1`。証明書は `arn:aws:acm:us-east-1:442730633672:certificate/1c93cef5-5e62-4b35-a5ac-321040f3ff1b`（`sotetsu-lab.com`・`*.sotetsu-lab.com`）
- スタック名は `sotetsu-lab-v3-prod-client-cfstack`、service は `sotetsu-lab-v3-client`、配置用バケットは既存の `sotetsu-lab-v3-prod-client-sls-deployment-bucket`（2024 年と同じ値。変えると別のスタックができる）
- 配信の論理 ID は `AppCloudFrontDistribution` のまま（変えると配信が作り直され、DNS が向いている `d1xqnisz459zf9.cloudfront.net` が消える）
- BFF の配り元は `5cmizgl4ie.execute-api.ap-northeast-1.amazonaws.com`、OriginPath は `/prod`
- キャッシュポリシー: 既定は `658327ea-f89d-4fab-a63d-7e88639e58f6`（Managed-CachingOptimized）、`/api/*` は `4135ea2d-6df8-44a3-9df3-4b5a84be39ad`（Managed-CachingDisabled）。`/api/*` の配り元リクエストポリシーは `b689b0a8-53d0-40ab-baf2-68738e2966ac`（本番の実物に合わせる。Terraform には書かれていない）
- AWS への書き込み（`osls deploy`・`update-distribution`・`terraform state rm`・削除）は、すべてユーザーが `!` で流す。エージェントは読むだけ（`aws-vault exec administrator -- aws … get/list/describe`）
- client #275（index.html を `no-cache` にする 2 回の `s3 sync`）がマージされていることを前提にする
- コミットは Conventional Commits＋絵文字・GPG 署名・サンドボックスの外で行う。master で直接コミットしない
- PR A（Task 1〜4）と PR B（Task 7）は別々のリリースにする

## Review Focus

- 深いリンク（`/operation/real-time` など拡張子の無い URL）が、新しい配信でも index.html を返すこと（`spa-routing` の写し漏れ）
- `/api/*` の POST・PUT・DELETE が BFF に届き、Cookie と認可ヘッダーが渡ること（ログイン・ログアウト）
- ハッシュ付きのファイルは `immutable`、それ以外は `no-cache` という #275 の Cache-Control が、新しいバケットでも付くこと
- 切り替えの最中と直後に `v3.sotetsu-lab.com` が 1 度も 403・404・証明書エラーを返さないこと
- 2024 年の Lambda 一式が消えても、配信が消えたり作り直されたりしないこと（論理 ID の取り違え）

---

## ファイルの地図

| ファイル | リポ | 役目 |
|---|---|---|
| `serverless.ts`（新規） | client | 配信一式の CloudFormation |
| `cloudfront/spa-routing.js`（新規） | client | 拡張子の無い GET を `/index.html` に寄せる CloudFront Function |
| `package.json`・`package-lock.json` | client | `osls`・`@serverless/typescript` を devDependencies に足す |
| `.gitignore` | client | `.serverless/` を無視する |
| `.github/workflows/deploy-on-push-version-tags.yml` | client | `osls deploy` と、Outputs から読んだバケット・配信への配置 |
| `docs/adr/0012-web-delivery-by-osls.md`（新規） | client | 決めた理由の記録 |
| `environments/default/main.tf`・`versions.tf`・`modules/web/`（削除） | infrastructure | web モジュールを外す |

---

### Task 1: `serverless.ts` と `spa-routing` を足す（client・ブランチ `build/web-delivery-osls`）

**Files:**
- Create: `serverless.ts`
- Create: `cloudfront/spa-routing.js`
- Modify: `package.json`・`package-lock.json`・`.gitignore`

**Interfaces:**
- Produces: スタックの Outputs `WebBucketName`（S3 バケット名）・`WebDistributionId`（配信 ID）。Task 4 のワークフローが読む
- Produces: `serverless.ts` の定数 `aliases`。Task 7 で `['v3.sotetsu-lab.com']` に変える

- [ ] **Step 1: master から作業ブランチを作り、空コミットを置く**

```bash
git -C /home/seapolis/Projects/sotetsu-lab-v3/sotetsu-lab-v3-client worktree add /home/seapolis/Projects/sotetsu-lab-v3/.context/wt-client-osls -b build/web-delivery-osls master
cd /home/seapolis/Projects/sotetsu-lab-v3/.context/wt-client-osls
git commit --allow-empty -m "first commit"
```

- [ ] **Step 2: osls を入れる（api と同じ版の幅）**

```bash
npm install --save-dev osls@^3.78.0 @serverless/typescript@^4.30.0
```

`package.json` の devDependencies に 2 つが足され、ほかの依存が動いていないことを `git diff package.json` で確かめる。

- [ ] **Step 3: `.gitignore` に `.serverless/` を足す**

`# compiled output` の塊の最後（`/bazel-out` の後）に次を足す。

```gitignore
# osls が package・deploy で作るもの
/.serverless
```

- [ ] **Step 4: `cloudfront/spa-routing.js` を書く**

本番の手作りの関数（`spa-routing`・`cloudfront-js-1.0`）の中身を写す。`console.log(event)` だけ落とす（毎リクエストのログで、使っていない）。

```js
// 拡張子の無い GET（画面の URL）を index.html に寄せる。Angular の画面遷移をブラウザに任せるため。
var indexPage = 'index.html';

function handler(event) {
    var request = event.request;
    var currentUri = request.uri;

    var doReplace = request.method === 'GET' && currentUri.indexOf('.') === -1;

    if (doReplace) {
        request.uri = '/' + indexPage;
    }

    return request;
}
```

- [ ] **Step 5: `serverless.ts` を書く**

```ts
import type { AWS } from '@serverless/typescript';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const system = 'sotetsu-lab-v3' as const;

// 切り替え（spec 12.2）が済むまでは、DNS が向いているワイルドカードのまま。
// Terraform の配信から v3.sotetsu-lab.com を外した後に ['v3.sotetsu-lab.com'] に変える。
const aliases = ['*.sotetsu-lab.com'];

const certificateArn =
    'arn:aws:acm:us-east-1:442730633672:certificate/1c93cef5-5e62-4b35-a5ac-321040f3ff1b';
const bffDomainName = '5cmizgl4ie.execute-api.ap-northeast-1.amazonaws.com';

const s3OriginId = 'Sotetsu Lab v3 Web S3 Bucket';
const bffOriginId = 'Backend For Frontend';

const serverlessConfiguration: AWS = {
    service: `${system}-client`,
    frameworkVersion: '3',
    provider: {
        name: 'aws',
        stage: 'prod',
        region: 'ap-northeast-1',
        stackName: '${param:prefix}-cfstack',
        stackTags: {
            System: system,
            Stage: '${sls:stage}',
            Serverless: 'true',
        },
        deploymentBucket: {
            name: '${param:prefix}-sls-deployment-bucket',
            serverSideEncryption: 'AES256',
        },
    },
    params: {
        default: {
            prefix: `${system}-\${sls:stage}-client`,
        },
    },
    resources: {
        Resources: {
            WebBucket: {
                Type: 'AWS::S3::Bucket',
                DeletionPolicy: 'Retain',
                UpdateReplacePolicy: 'Retain',
                Properties: {
                    BucketName: '${param:prefix}-web-bucket',
                    OwnershipControls: {
                        Rules: [{ ObjectOwnership: 'BucketOwnerEnforced' }],
                    },
                    PublicAccessBlockConfiguration: {
                        BlockPublicAcls: true,
                        BlockPublicPolicy: true,
                        IgnorePublicAcls: true,
                        RestrictPublicBuckets: true,
                    },
                },
            },
            WebBucketPolicy: {
                Type: 'AWS::S3::BucketPolicy',
                Properties: {
                    Bucket: { Ref: 'WebBucket' },
                    PolicyDocument: {
                        Version: '2012-10-17',
                        Statement: [
                            {
                                Effect: 'Allow',
                                Principal: { Service: 'cloudfront.amazonaws.com' },
                                Action: 's3:GetObject',
                                Resource: {
                                    'Fn::Join': ['', [{ 'Fn::GetAtt': ['WebBucket', 'Arn'] }, '/*']],
                                },
                                Condition: {
                                    StringEquals: {
                                        'AWS:SourceArn': {
                                            'Fn::Join': [
                                                '',
                                                [
                                                    'arn:aws:cloudfront::${aws:accountId}:distribution/',
                                                    { Ref: 'AppCloudFrontDistribution' },
                                                ],
                                            ],
                                        },
                                    },
                                },
                            },
                        ],
                    },
                },
            },
            WebCloudFrontOriginAccessControlToS3: {
                Type: 'AWS::CloudFront::OriginAccessControl',
                Properties: {
                    OriginAccessControlConfig: {
                        Name: '${param:prefix}-web-s3-oac',
                        OriginAccessControlOriginType: 's3',
                        SigningBehavior: 'always',
                        SigningProtocol: 'sigv4',
                    },
                },
            },
            WebSpaRoutingFunction: {
                Type: 'AWS::CloudFront::Function',
                Properties: {
                    // 手で作った本番の spa-routing と名前がぶつからないようにする
                    Name: '${param:prefix}-spa-routing',
                    AutoPublish: true,
                    FunctionConfig: {
                        Comment: '拡張子の無い GET を index.html に寄せる',
                        Runtime: 'cloudfront-js-2.0',
                    },
                    FunctionCode: readFileSync(
                        join(__dirname, 'cloudfront/spa-routing.js'),
                        'utf-8',
                    ),
                },
            },
            // 論理 ID は 2024 年のスタックと同じ。変えると配信が作り直され、DNS の向き先が消える
            AppCloudFrontDistribution: {
                Type: 'AWS::CloudFront::Distribution',
                DeletionPolicy: 'Retain',
                UpdateReplacePolicy: 'Retain',
                Properties: {
                    DistributionConfig: {
                        Enabled: true,
                        HttpVersion: 'http2and3',
                        IPV6Enabled: true,
                        PriceClass: 'PriceClass_All',
                        DefaultRootObject: 'index.html',
                        Aliases: aliases,
                        ViewerCertificate: {
                            AcmCertificateArn: certificateArn,
                            MinimumProtocolVersion: 'TLSv1.2_2021',
                            SslSupportMethod: 'sni-only',
                        },
                        Origins: [
                            {
                                Id: s3OriginId,
                                DomainName: {
                                    'Fn::GetAtt': ['WebBucket', 'RegionalDomainName'],
                                },
                                OriginAccessControlId: {
                                    Ref: 'WebCloudFrontOriginAccessControlToS3',
                                },
                                S3OriginConfig: { OriginAccessIdentity: '' },
                            },
                            {
                                Id: bffOriginId,
                                DomainName: bffDomainName,
                                OriginPath: '/prod',
                                CustomOriginConfig: {
                                    OriginProtocolPolicy: 'https-only',
                                    OriginSSLProtocols: ['TLSv1.2'],
                                },
                            },
                        ],
                        DefaultCacheBehavior: {
                            TargetOriginId: s3OriginId,
                            // Managed-CachingOptimized
                            CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
                            ViewerProtocolPolicy: 'redirect-to-https',
                            AllowedMethods: ['GET', 'HEAD'],
                            CachedMethods: ['GET', 'HEAD'],
                            Compress: true,
                            FunctionAssociations: [
                                {
                                    EventType: 'viewer-request',
                                    FunctionARN: {
                                        'Fn::GetAtt': ['WebSpaRoutingFunction', 'FunctionARN'],
                                    },
                                },
                            ],
                        },
                        CacheBehaviors: [
                            {
                                PathPattern: '/api/*',
                                TargetOriginId: bffOriginId,
                                // Managed-CachingDisabled
                                CachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad',
                                // Managed-AllViewerExceptHostHeader（本番の実物に合わせる）
                                OriginRequestPolicyId: 'b689b0a8-53d0-40ab-baf2-68738e2966ac',
                                ViewerProtocolPolicy: 'redirect-to-https',
                                AllowedMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE'],
                                CachedMethods: ['GET', 'HEAD'],
                                Compress: true,
                            },
                        ],
                    },
                },
            },
        },
        Outputs: {
            WebBucketName: { Value: { Ref: 'WebBucket' } },
            WebDistributionId: { Value: { Ref: 'AppCloudFrontDistribution' } },
        },
    },
};

module.exports = serverlessConfiguration;
```

`functions` は書かない。2024 年の Lambda・Function URL・Lambda 用の OAC・キャッシュポリシー・層は、テンプレートから外れるので次の deploy で消える。

- [ ] **Step 6: 手元でテンプレートを作り、中身を確かめる（AWS には触らない）**

```bash
npx osls package
```

AWS の認証が無いと落ちる場合は、そこで止めて報告する（`aws-vault` で通さない。package は書き込まないが、確かめていない動きを本番の認証で走らせない）。

通ったら、次で中身を確かめる。

```bash
python3 - <<'EOF'
import json
t = json.load(open('.serverless/cloudformation-template-update-stack.json'))
r = t['Resources']
want = {'WebBucket', 'WebBucketPolicy', 'WebCloudFrontOriginAccessControlToS3', 'WebSpaRoutingFunction', 'AppCloudFrontDistribution'}
missing = want - set(r)
assert not missing, missing
lambdas = [k for k, v in r.items() if v['Type'].startswith('AWS::Lambda::')]
assert not lambdas, lambdas
d = r['AppCloudFrontDistribution']['Properties']['DistributionConfig']
assert d['Aliases'] == ['*.sotetsu-lab.com'], d['Aliases']
assert [o['Id'] for o in d['Origins']] == ['Sotetsu Lab v3 Web S3 Bucket', 'Backend For Frontend']
assert d['CacheBehaviors'][0]['PathPattern'] == '/api/*'
assert 'index.html' in r['WebSpaRoutingFunction']['Properties']['FunctionCode']
assert set(t['Outputs']) >= {'WebBucketName', 'WebDistributionId'}, t['Outputs'].keys()
print('OK', sorted(r))
EOF
```

期待: `OK [...]` が出る。リソースの一覧に `ServerlessDeploymentBucket` が無いこと（既存のバケットを名前で使うため）も目で確かめる。

- [ ] **Step 7: lint**

```bash
npx eslint serverless.ts
npx prettier --check serverless.ts cloudfront/spa-routing.js
```

期待: どちらも 0 件。prettier が直すなら `npx prettier --write` をこの 2 ファイルだけにかける。

- [ ] **Step 8: コミット（サンドボックスの外・署名を確かめる）**

```bash
git add package.json package-lock.json .gitignore
git commit -m "build: :package: 画面の配信を osls で配るため osls を入れる"
git add serverless.ts cloudfront/spa-routing.js
git commit -m "refactor: :wrench: 画面の配信（S3・CloudFront・spa-routing）を serverless.ts に書く"
git log -2 --show-signature --oneline
```

---

### Task 2: ADR を書く（client）

**Files:**
- Create: `docs/adr/0012-web-delivery-by-osls.md`

- [ ] **Step 1: ADR を書く**

既存の ADR（`docs/adr/0011-login-register-pages.md`）の見出しの形にそろえる。書くこと:
  - 背景: 画面の配信だけが Terraform で、API の配信は api の `serverless.ts`。SSR の Lambda と配信を別々の道具で作ると、配り元の URL と呼び出しの許可（配信の ARN）を互いに待つ。ユーザーが Terraform をやめたいと判断した（範囲は web モジュールだけ）
  - 決定: client の `serverless.ts` に配信一式を書く。2024 年のスタックと配信（論理 ID `AppCloudFrontDistribution`）を使い回す。DNS はもともとそこを向いているので変えない
  - 見送った案: 新しい配信を作って別名を `associate-alias` で移す（DNS の書き換えが要る）。CloudFormation の取り込み（osls に機能が無い・手作業が多い）
  - 結果: Terraform の web モジュール・GitHub の secret 2 つ・手作りの `spa-routing` が要らなくなる。配信を変えるときは client の PR で行う
  - 出典: spec 12 章・AWS「Move an alternate domain name」

- [ ] **Step 2: コミット**

```bash
git add docs/adr/0012-web-delivery-by-osls.md
git diff --cached --stat
git commit -m "docs: :memo: 画面の配信を osls に移す ADR を足す"
```

`--stat` に ADR 1 ファイルだけが出ることを確かめてから commit する。

---

### Task 3: スタックを初めて上書きする（ユーザーが流す）

この時点では本番の `v3.sotetsu-lab.com` は `E5C8TB9HLVQF9` が答えているので、利用者には影響しない。

- [ ] **Step 1: 変更セットの中身を先に見る（読むだけ）**

エージェントが、今のテンプレートと Task 1 Step 6 で作ったテンプレートの論理 ID を突き合わせ、「残る・消える・増える」の表をユーザーに見せる。`AppCloudFrontDistribution` が「残る」に入っていること（`AWS::CloudFront::Distribution` の `DistributionConfig` の変更は作り直しにならない。CloudFormation の文書で「Update requires: No interruption」）。

```bash
aws-vault exec administrator -- aws cloudformation get-template --stack-name sotetsu-lab-v3-prod-client-cfstack --query TemplateBody --output json > /home/seapolis/Projects/sotetsu-lab-v3/.context/ssr-plan/client-stack-current.json
python3 - <<'EOF'
import json
cur = json.load(open('/home/seapolis/Projects/sotetsu-lab-v3/.context/ssr-plan/client-stack-current.json'))
cur = json.loads(cur) if isinstance(cur, str) else cur
new = json.load(open('.serverless/cloudformation-template-update-stack.json'))
a, b = set(cur['Resources']), set(new['Resources'])
print('残る', sorted(a & b)); print('消える', sorted(a - b)); print('増える', sorted(b - a))
assert 'AppCloudFrontDistribution' in a & b
EOF
```

- [ ] **Step 2: ユーザーが deploy する**

```
! cd /home/seapolis/Projects/sotetsu-lab-v3/.context/wt-client-osls && aws-vault exec administrator -- npx osls deploy
```

- [ ] **Step 3: 結果を読む（エージェント）**

```bash
aws-vault exec administrator -- aws cloudformation describe-stack-resources --stack-name sotetsu-lab-v3-prod-client-cfstack --query "StackResources[].{L:LogicalResourceId,T:ResourceType,P:PhysicalResourceId}" --output table
```

期待: `AppCloudFrontDistribution` の物理 ID が `EOE7HW33MVGR6` のまま。Lambda の行が無い。

- [ ] **Step 4: 今の本番のファイルを新しいバケットに写す（ユーザー）**

```
! aws-vault exec administrator -- aws s3 sync s3://sotetsu-lab-v3-client-prod s3://sotetsu-lab-v3-prod-client-web-bucket
```

`s3 sync` はバケット間でメタデータ（Cache-Control）をそのまま写す。

- [ ] **Step 5: 新しい配信を `*.cloudfront.net` の名前で確かめる（エージェント）**

```bash
NEW=https://d1xqnisz459zf9.cloudfront.net
OLD=https://v3.sotetsu-lab.com
curl -sI "$NEW/"
curl -sI "$NEW/operation/real-time"
curl -s "$NEW/api/maintenance"
curl -s "$OLD/api/maintenance"
curl -s "$NEW/" -o new-index.html
curl -s "$OLD/" -o old-index.html
cmp new-index.html old-index.html
```

期待: `/` と `/operation/real-time` が 200・`text/html`・`cache-control: no-cache`（#275 のデプロイ後なら）。`/api/maintenance` の返事が新旧で同じ。index.html が新旧で同じ。

index.html の中の `main-*.js` を 1 つ選び、`curl -sI "$NEW/main-XXXX.js"` が 200・`immutable` であることも確かめる。

---

### Task 4: デプロイのワークフローで両方に置く（client・PR A）

**Files:**
- Modify: `.github/workflows/deploy-on-push-version-tags.yml`

切り替えが済むまで、Terraform の配信（今の本番）と osls の配信の両方に置く。

- [ ] **Step 1: 「Deploy and create invalidation」の手順を置き換える**

`Configure AWS credentials` の後を次にする。

```yaml
      - name: Deploy AWS resources
        run: npx osls deploy

      - name: Deploy and create invalidation
        # 名前にハッシュの付くファイルだけ 1 年置き、index.html・ngsw*.json・assets/ などは毎回確かめさせる。
        # 全部 1 年にすると、Service Worker の無いブラウザが古い index.html を使い続ける。
        run: |
          output() {
            aws cloudformation describe-stacks --stack-name sotetsu-lab-v3-prod-client-cfstack \
              --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
          }
          deploy() {
            aws s3 sync ./dist/build-by-ci/browser "s3://$1" --delete --cache-control "public, max-age=31536000, immutable" \
              --exclude "*" --include "chunk-*.js" --include "main-*.js" --include "polyfills-*.js" --include "styles-*.css" --include "media/*"
            aws s3 sync ./dist/build-by-ci/browser "s3://$1" --delete --cache-control "no-cache" \
              --exclude "chunk-*.js" --exclude "main-*.js" --exclude "polyfills-*.js" --exclude "styles-*.css" --exclude "media/*"
            aws cloudfront create-invalidation --distribution-id "$2" --paths '/*'
          }
          # 切り替え（spec 12.2）が済むまで、Terraform の配信（今の本番）にも置く
          deploy "${{ secrets.DEPLOY_BUCKET_NAME }}" "${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }}"
          deploy "$(output WebBucketName)" "$(output WebDistributionId)"
```

- [ ] **Step 2: YAML として読めるか確かめる**

```bash
python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/deploy-on-push-version-tags.yml')); print('OK')"
```

- [ ] **Step 3: コミット・push・PR（PR A）**

```bash
git add .github/workflows/deploy-on-push-version-tags.yml
git commit -m "ci: :construction_worker: osls の配信を作り、Terraform の配信と両方に置く"
git log -1 --show-signature --oneline
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push -u https://github.com/kaito3desuyo/sotetsu-lab-v3-client.git build/web-delivery-osls
gh pr create --base master --title "build: 画面の配信を osls に移す（切り替え前）" --body-file <本文>
```

本文には Task 3 の確認結果と、この PR では本番の答え手が変わらないことを書く。

---

### Task 5: PR A をリリースして確かめる（ユーザー＋エージェント）

- [ ] **Step 1: ユーザーがマージし、版を上げてタグを push する**（コミットの型が build・ci・refactor・docs なので patch）
- [ ] **Step 2: Actions の deploy が通ったことをエージェントが確かめる**（`gh run list -R kaito3desuyo/sotetsu-lab-v3-client -L 1`）
- [ ] **Step 3: Task 3 Step 5 の確かめをもう一度流す**。新旧の index.html が同じ版になっていること

---

### Task 6: 切り替える（ユーザーが流す・エージェントが確かめる）

- [ ] **Step 1: Terraform に手を引かせる（ユーザー）**

```
! cd /home/seapolis/Projects/sotetsu-lab-v3/sotetsu-lab-v3-infrastructure/environments/default && aws-vault exec administrator -- terraform state rm module.web
```

AWS のリソースは消えない。Terraform が web を覚えなくなるだけ。

- [ ] **Step 2: エージェントが、別名を外した設定ファイルを作る（読むだけ）**

```bash
cd /home/seapolis/Projects/sotetsu-lab-v3/.context/ssr-plan
aws-vault exec administrator -- aws cloudfront get-distribution-config --id E5C8TB9HLVQF9 --output json > e5c8-before.json
python3 - <<'EOF'
import json
d = json.load(open('e5c8-before.json'))
c = d['DistributionConfig']
c['Aliases'] = {'Quantity': 0}
c['ViewerCertificate'] = {'CloudFrontDefaultCertificate': True, 'MinimumProtocolVersion': 'TLSv1', 'CertificateSource': 'cloudfront'}
json.dump(c, open('e5c8-noalias.json', 'w'), ensure_ascii=False, indent=2)
print(d['ETag'])
EOF
```

`e5c8-before.json` は切り戻し用に残す。

- [ ] **Step 3: ユーザーが別名を外す**

```
! cd /home/seapolis/Projects/sotetsu-lab-v3/.context/ssr-plan && aws-vault exec administrator -- aws cloudfront update-distribution --id E5C8TB9HLVQF9 --if-match <Step 2 の ETag> --distribution-config file://e5c8-noalias.json
```

- [ ] **Step 4: エージェントが確かめる**

```bash
aws-vault exec administrator -- aws cloudfront wait distribution-deployed --id E5C8TB9HLVQF9
for i in 1 2 3 4 5; do curl -s -o /dev/null -w '%{http_code} ' https://v3.sotetsu-lab.com/; done
curl -sI https://v3.sotetsu-lab.com/operation/real-time
curl -s https://v3.sotetsu-lab.com/api/maintenance
aws-vault exec administrator -- aws cloudfront get-distribution-config --id E5C8TB9HLVQF9 --query "DistributionConfig.Aliases"
```

期待: すべて 200。`E5C8TB9HLVQF9` の別名が 0 件。Playwright で `https://v3.sotetsu-lab.com/` を開き、ダッシュボード・real-time が出て、ログイン画面が開くことも見る。

**切り戻し:** `e5c8-before.json` の `DistributionConfig` を新しい ETag で `update-distribution` に渡せば、別名が戻る（その時点で `v3.sotetsu-lab.com` を持つ配信は他に無い）。

---

### Task 7: 別名をちょうどの名前にし、片方だけに置く（client・PR B）

**Files:**
- Modify: `serverless.ts`
- Modify: `.github/workflows/deploy-on-push-version-tags.yml`

- [ ] **Step 1: master から `build/web-delivery-osls-cutover` を作り、空コミットを置く**
- [ ] **Step 2: `serverless.ts` の `aliases` を変える**

```ts
const aliases = ['v3.sotetsu-lab.com'];
```

上の 2 行のコメント（切り替えが済むまで…）も消す。

- [ ] **Step 3: ワークフローから Terraform の配信への配置を消す**

`# 切り替え（spec 12.2）が済むまで…` のコメントと `deploy "${{ secrets.DEPLOY_BUCKET_NAME }}" …` の行を消す。残るのは `deploy "$(output WebBucketName)" "$(output WebDistributionId)"` だけ。

- [ ] **Step 4: Task 1 Step 6 の確かめを、`Aliases` の期待値を `['v3.sotetsu-lab.com']` にして流す**
- [ ] **Step 5: コミット 2 つ（`refactor: :wrench:` と `ci: :construction_worker:`）・push・PR B**
- [ ] **Step 6: ユーザーがマージ・タグ push。エージェントが Task 6 Step 4 の確かめを流す**。`EOE7HW33MVGR6` の別名が `v3.sotetsu-lab.com` だけになっていること

---

### Task 8: Terraform から web モジュールを外す（infrastructure）

**Files:**
- Modify: `environments/default/main.tf`（`data "aws_acm_certificate" "virginia"` と `module "web"` を消す）
- Modify: `environments/default/versions.tf`（`provider "aws"` の `alias = "virginia"` の塊を消す。web 以外で使っていない）
- Delete: `modules/web/`

- [ ] **Step 1: infrastructure の master から worktree を作る**（本体のチェックアウトにはユーザーの未コミットの変更があるので触らない）

```bash
git -C /home/seapolis/Projects/sotetsu-lab-v3/sotetsu-lab-v3-infrastructure worktree add /home/seapolis/Projects/sotetsu-lab-v3/.context/wt-infra-web -b refactor/remove-web-module master
```

- [ ] **Step 2: 消す。`grep -rn 'virginia\|module.web' environments modules` が 0 件になること**
- [ ] **Step 3: `terraform fmt -check -recursive` と `terraform validate`**（`validate` は `init -backend=false` の後）
- [ ] **Step 4: コミット（`git rm -r modules/web` は使わず `rm -r` してから `git add -A`）・push・PR**
- [ ] **Step 5: ユーザーが、自分の未コミットの変更を残したまま、このブランチを取り込んで `terraform plan` を流す**。web 関係の差分が出ないこと

---

### Task 9: 1 週間後の片付け（ユーザーが流す）

切り替えから 1 週間、問題が無ければ消す。エージェントは消す前に、それぞれが使われていないことを読んで確かめる。

- [ ] 古い配信 `E5C8TB9HLVQF9`: 無効にし、`wait distribution-deployed` の後に削除
- [ ] 古いバケット `sotetsu-lab-v3-client-prod`: 空にして削除
- [ ] 古い OAC `E26WD6OPPY0IT4` と、手作りの関数 `spa-routing`
- [ ] GitHub の secret `DEPLOY_BUCKET_NAME`・`CLOUDFRONT_DISTRIBUTION_ID`（`gh secret delete -R kaito3desuyo/sotetsu-lab-v3-client`）

範囲外（気づいたことの記録だけ）: `angular-v17-ssr-example-cfstack`・`ng-univ-lambda-template-*` のスタックも 2019〜2023 年の残り。`GitHubActionsRole` は `AdministratorAccess` で `kaito3desuyo/*` のどのリポからも引き受けられる。

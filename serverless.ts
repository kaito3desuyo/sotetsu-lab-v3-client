import type { AWS } from '@serverless/typescript';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const system = 'sotetsu-lab-v3' as const;

const certificateArn =
    'arn:aws:acm:us-east-1:442730633672:certificate/1c93cef5-5e62-4b35-a5ac-321040f3ff1b';
const bffDomainName = '5cmizgl4ie.execute-api.ap-northeast-1.amazonaws.com';

const s3OriginId = 'Sotetsu Lab v3 Web S3 Bucket';
const bffOriginId = 'Backend For Frontend';
const ssrOriginId = 'Sotetsu Lab v3 SSR Lambda Function URL';

// AWS Lambda Web Adapter（arm64）のレイヤー。版は awslabs/aws-lambda-web-adapter の README の記載
const lambdaWebAdapterLayerArn =
    'arn:aws:lambda:ap-northeast-1:753240598075:layer:LambdaAdapterLayerArm64:30';

// ssr=on のとき、既定の振り分けを SSR の Lambda に向ける。ssr=off のときは S3 の殻（spa-routing 経由）に戻す。
// ${param:ssr} は osls が文字列として解くので、TypeScript の中では読めない。そこで CloudFormation の Conditions で切り替える
const s3Behavior = {
    TargetOriginId: s3OriginId,
    // Managed-CachingOptimized
    CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
    ViewerProtocolPolicy: 'redirect-to-https',
    AllowedMethods: ['GET', 'HEAD'],
    CachedMethods: ['GET', 'HEAD'],
    Compress: true,
};

const serverlessConfiguration: AWS = {
    service: `${system}-client`,
    frameworkVersion: '3',
    provider: {
        name: 'aws',
        stage: 'prod',
        region: 'ap-northeast-1',
        logRetentionInDays: 30,
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
    package: {
        patterns: [
            '!**',
            'lambda/run.sh',
            'dist/build-by-ci/server/**',
            // server.ts が 6MB 超のとき返す殻（server.mjs の ../browser/index.csr.html）
            'dist/build-by-ci/browser/index.csr.html',
        ],
    },
    params: {
        default: {
            prefix: `${system}-\${sls:stage}-client`,
            // SSR の入り口。'off' にすると既定の振り分けが S3 の殻に戻る（--param="ssr=off"）
            ssr: 'on',
            // 配信の別名。空なら別名も ACM の証明書も付けない（stg）
            aliases: '',
        },
        prod: {
            aliases: 'v3.sotetsu-lab.com',
        },
    },
    functions: {
        ssr: {
            // LWA が起動スクリプトとして実行する。中で dist/build-by-ci/server/server.mjs を立てる
            handler: 'lambda/run.sh',
            name: '${param:prefix}-ssr-lambda',
            runtime: 'nodejs24.x',
            architecture: 'arm64',
            memorySize: 2048,
            timeout: 20,
            layers: [lambdaWebAdapterLayerArn],
            environment: {
                // production でないと Express の finalhandler が 500 の本文に err.stack を出す
                NODE_ENV: 'production',
                AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
                AWS_LWA_PORT: '8080',
                AWS_LWA_READINESS_CHECK_PATH: '/healthz',
                PORT: '8080',
            },
            url: { authorizer: 'aws_iam' },
        },
    },
    resources: {
        // osls は Function URL に InvokeMode を付けない（既定の BUFFERED になる）。明示して固定する
        extensions: {
            SsrLambdaFunctionUrl: {
                Properties: { InvokeMode: 'BUFFERED' },
            },
        },
        Conditions: {
            SsrOn: { 'Fn::Equals': ['${param:ssr}', 'on'] },
            HasAliases: {
                'Fn::Not': [{ 'Fn::Equals': ['${param:aliases}', ''] }],
            },
        },
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
                                Principal: {
                                    Service: 'cloudfront.amazonaws.com',
                                },
                                Action: 's3:GetObject',
                                Resource: {
                                    'Fn::Join': [
                                        '',
                                        [
                                            {
                                                'Fn::GetAtt': [
                                                    'WebBucket',
                                                    'Arn',
                                                ],
                                            },
                                            '/*',
                                        ],
                                    ],
                                },
                                Condition: {
                                    StringEquals: {
                                        // osls の ${aws:accountId} は package の時点で STS を呼ぶので、
                                        // CloudFormation の擬似パラメーターで解く（手元の package を認証なしで通す）
                                        'AWS:SourceArn': {
                                            'Fn::Sub':
                                                'arn:aws:cloudfront::${AWS::AccountId}:distribution/${AppCloudFrontDistribution}',
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
            SsrCloudFrontOriginAccessControlToLambda: {
                Type: 'AWS::CloudFront::OriginAccessControl',
                Properties: {
                    OriginAccessControlConfig: {
                        Name: '${param:prefix}-ssr-lambda-oac',
                        OriginAccessControlOriginType: 'lambda',
                        SigningBehavior: 'always',
                        SigningProtocol: 'sigv4',
                    },
                },
            },
            // AWS_IAM の Function URL を CloudFront（この配信）だけが呼べるようにする許可の 2 つ組
            SsrLambdaInvokeFunctionUrlPermission: {
                Type: 'AWS::Lambda::Permission',
                Properties: {
                    FunctionName: {
                        'Fn::GetAtt': ['SsrLambdaFunction', 'Arn'],
                    },
                    Action: 'lambda:InvokeFunctionUrl',
                    Principal: 'cloudfront.amazonaws.com',
                    FunctionUrlAuthType: 'AWS_IAM',
                    SourceArn: {
                        'Fn::Sub':
                            'arn:aws:cloudfront::${AWS::AccountId}:distribution/${AppCloudFrontDistribution}',
                    },
                },
            },
            SsrLambdaInvokeFunctionPermission: {
                Type: 'AWS::Lambda::Permission',
                Properties: {
                    FunctionName: {
                        'Fn::GetAtt': ['SsrLambdaFunction', 'Arn'],
                    },
                    Action: 'lambda:InvokeFunction',
                    Principal: 'cloudfront.amazonaws.com',
                    InvokedViaFunctionUrl: true,
                    SourceArn: {
                        'Fn::Sub':
                            'arn:aws:cloudfront::${AWS::AccountId}:distribution/${AppCloudFrontDistribution}',
                    },
                },
            },
            // SSR の応答は Cache-Control（s-maxage 等）に従って置く。Cookie と Authorization は見ない（キーにも origin にも渡さない）
            SsrCachePolicy: {
                Type: 'AWS::CloudFront::CachePolicy',
                Properties: {
                    CachePolicyConfig: {
                        Name: '${param:prefix}-ssr-cache-policy',
                        MinTTL: 0,
                        DefaultTTL: 0,
                        MaxTTL: 31536000,
                        ParametersInCacheKeyAndForwardedToOrigin: {
                            EnableAcceptEncodingGzip: true,
                            EnableAcceptEncodingBrotli: true,
                            CookiesConfig: { CookieBehavior: 'none' },
                            HeadersConfig: { HeaderBehavior: 'none' },
                            // クエリは鍵にも Lambda にも入れない。SSR のページはクエリを読まず、fbclid・utm_* で鍵が割れて毎回描き直すため（spec 8 章・2026-10-28）
                            QueryStringsConfig: { QueryStringBehavior: 'none' },
                        },
                    },
                },
            },
            WebSpaRoutingFunction: {
                Type: 'AWS::CloudFront::Function',
                Properties: {
                    // 手で作った本番の spa-routing と名前がぶつからないようにする
                    Name: '${param:prefix}-spa-routing-function',
                    AutoPublish: true,
                    FunctionConfig: {
                        Comment:
                            '拡張子の無い GET を index.csr.html（SSR ビルドの殻）に寄せる',
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
                        // ssr=on では付けない。付けると / が /index.csr.html（*.* で S3 の殻）に回り、トップが SSR されない。
                        // ssr=off は SSR ビルドに index.html が無いので、殻の index.csr.html を指す
                        DefaultRootObject: {
                            'Fn::If': [
                                'SsrOn',
                                { Ref: 'AWS::NoValue' },
                                'index.csr.html',
                            ],
                        },
                        Aliases: {
                            'Fn::If': [
                                'HasAliases',
                                ['${param:aliases}'],
                                { Ref: 'AWS::NoValue' },
                            ],
                        },
                        ViewerCertificate: {
                            'Fn::If': [
                                'HasAliases',
                                {
                                    AcmCertificateArn: certificateArn,
                                    MinimumProtocolVersion: 'TLSv1.2_2021',
                                    SslSupportMethod: 'sni-only',
                                },
                                { Ref: 'AWS::NoValue' },
                            ],
                        },
                        // 切り戻しのときも外さない（外すと Cache-Tag で貯めたタグが抜ける）
                        CacheTagConfig: { HeaderName: 'Cache-Tag' },
                        // CustomErrorResponses は付けない。殻への切り替えは server.ts が描いた HTML が 6MB 超のときだけ行う。
                        // Lambda が落ちた・時間切れのときは CloudFront のエラーになる
                        // （配信全体の CustomErrorResponses は /api/* の 5xx も殻の 200 に化けさせる）
                        Origins: [
                            {
                                Id: s3OriginId,
                                DomainName: {
                                    'Fn::GetAtt': [
                                        'WebBucket',
                                        'RegionalDomainName',
                                    ],
                                },
                                OriginAccessControlId: {
                                    Ref: 'WebCloudFrontOriginAccessControlToS3',
                                },
                                S3OriginConfig: { OriginAccessIdentity: '' },
                            },
                            {
                                Id: ssrOriginId,
                                // https://<id>.lambda-url.<region>.on.aws/ からホスト名だけ取る
                                DomainName: {
                                    'Fn::Select': [
                                        2,
                                        {
                                            'Fn::Split': [
                                                '/',
                                                {
                                                    'Fn::GetAtt': [
                                                        'SsrLambdaFunctionUrl',
                                                        'FunctionUrl',
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                OriginAccessControlId: {
                                    Ref: 'SsrCloudFrontOriginAccessControlToLambda',
                                },
                                OriginShield: {
                                    Enabled: true,
                                    OriginShieldRegion: 'ap-northeast-1',
                                },
                                CustomOriginConfig: {
                                    OriginProtocolPolicy: 'https-only',
                                    OriginSSLProtocols: ['TLSv1.2'],
                                },
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
                            'Fn::If': [
                                'SsrOn',
                                // OriginRequestPolicy も関数の関連付けも付けない（Cookie・Authorization を origin に送らない）
                                {
                                    TargetOriginId: ssrOriginId,
                                    CachePolicyId: { Ref: 'SsrCachePolicy' },
                                    ViewerProtocolPolicy: 'redirect-to-https',
                                    AllowedMethods: ['GET', 'HEAD'],
                                    CachedMethods: ['GET', 'HEAD'],
                                    Compress: true,
                                },
                                {
                                    ...s3Behavior,
                                    FunctionAssociations: [
                                        {
                                            EventType: 'viewer-request',
                                            FunctionARN: {
                                                'Fn::GetAtt': [
                                                    'WebSpaRoutingFunction',
                                                    'FunctionARN',
                                                ],
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                        CacheBehaviors: [
                            {
                                PathPattern: '/api/*',
                                TargetOriginId: bffOriginId,
                                // Managed-CachingDisabled
                                CachePolicyId:
                                    '4135ea2d-6df8-44a3-9df3-4b5a84be39ad',
                                // Managed-AllViewerExceptHostHeader（本番の実物に合わせる）
                                OriginRequestPolicyId:
                                    'b689b0a8-53d0-40ab-baf2-68738e2966ac',
                                ViewerProtocolPolicy: 'redirect-to-https',
                                AllowedMethods: [
                                    'GET',
                                    'HEAD',
                                    'OPTIONS',
                                    'PUT',
                                    'PATCH',
                                    'POST',
                                    'DELETE',
                                ],
                                CachedMethods: ['GET', 'HEAD'],
                                Compress: true,
                            },
                            // ssr=on のときだけ。拡張子のあるもの（JS・CSS・画像・殻の index.csr.html）は S3 から返す
                            {
                                'Fn::If': [
                                    'SsrOn',
                                    { PathPattern: '*.*', ...s3Behavior },
                                    { Ref: 'AWS::NoValue' },
                                ],
                            },
                        ],
                    },
                },
            },
        },
        Outputs: {
            WebBucketName: { Value: { Ref: 'WebBucket' } },
            WebDistributionId: { Value: { Ref: 'AppCloudFrontDistribution' } },
            SsrFunctionUrl: {
                Value: {
                    'Fn::GetAtt': ['SsrLambdaFunctionUrl', 'FunctionUrl'],
                },
            },
        },
    },
};

module.exports = serverlessConfiguration;

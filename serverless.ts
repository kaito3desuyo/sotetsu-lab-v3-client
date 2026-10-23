import type { AWS } from '@serverless/typescript';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const system = 'sotetsu-lab-v3' as const;

const aliases = ['v3.sotetsu-lab.com'];

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
            WebSpaRoutingFunction: {
                Type: 'AWS::CloudFront::Function',
                Properties: {
                    // 手で作った本番の spa-routing と名前がぶつからないようにする
                    Name: '${param:prefix}-spa-routing-function',
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
                            CachePolicyId:
                                '658327ea-f89d-4fab-a63d-7e88639e58f6',
                            ViewerProtocolPolicy: 'redirect-to-https',
                            AllowedMethods: ['GET', 'HEAD'],
                            CachedMethods: ['GET', 'HEAD'],
                            Compress: true,
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

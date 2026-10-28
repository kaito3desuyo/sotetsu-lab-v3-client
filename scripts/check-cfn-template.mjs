// osls package が作った CloudFormation テンプレートを、SSR の配信の取り決めに照らして確かめる。
// 使い方: node scripts/check-cfn-template.mjs --stage <prod|stg> --ssr <on|off> [--template <path>]
// 1 つでも外れたら 1 で終わる。AWS には触らない（テンプレートの JSON を読むだけ）。
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual, parseArgs } from 'node:util';

const { values: args } = parseArgs({
    options: {
        stage: { type: 'string', default: 'prod' },
        ssr: { type: 'string', default: 'on' },
        template: {
            type: 'string',
            default: '.serverless/cloudformation-template-update-stack.json',
        },
    },
});

if (
    !['prod', 'stg'].includes(args.stage) ||
    !['on', 'off'].includes(args.ssr)
) {
    console.error('--stage は prod|stg、--ssr は on|off');
    process.exit(2);
}
const ssrOn = args.ssr === 'on';

const raw = JSON.parse(readFileSync(args.template, 'utf-8'));
const failures = [];
const check = (label, ok, detail) => {
    if (!ok) {
        failures.push(
            detail === undefined
                ? label
                : `${label}（${JSON.stringify(detail)}）`,
        );
    }
};

// ---- Conditions と Fn::If を解いた形にする（Ref AWS::NoValue は項目ごと消す）----
const evalCondition = (name) => {
    const cond = raw.Conditions?.[name];
    if (cond === undefined) {
        throw new Error(`Conditions に ${name} が無い`);
    }
    return evalCondExpr(cond);
};
const evalCondExpr = (expr) => {
    if ('Fn::Equals' in expr) {
        const [a, b] = expr['Fn::Equals'];
        return isDeepStrictEqual(a, b);
    }
    if ('Fn::Not' in expr) {
        return !evalCondExpr(expr['Fn::Not'][0]);
    }
    if ('Condition' in expr) {
        return evalCondition(expr.Condition);
    }
    throw new Error(`解けない条件: ${JSON.stringify(expr)}`);
};
const NO_VALUE = Symbol('NoValue');
const resolve = (node) => {
    if (Array.isArray(node)) {
        return node.map(resolve).filter((v) => v !== NO_VALUE);
    }
    if (node && typeof node === 'object') {
        if (isDeepStrictEqual(node, { Ref: 'AWS::NoValue' })) {
            return NO_VALUE;
        }
        if ('Fn::If' in node) {
            const [name, whenTrue, whenFalse] = node['Fn::If'];
            return resolve(evalCondition(name) ? whenTrue : whenFalse);
        }
        const out = {};
        for (const [k, v] of Object.entries(node)) {
            const r = resolve(v);
            if (r !== NO_VALUE) {
                out[k] = r;
            }
        }
        return out;
    }
    return node;
};
const template = resolve(raw);
const resources = template.Resources;
const byType = (type) =>
    Object.entries(resources).filter(([, r]) => r.Type === type);
const one = (type) => {
    const found = byType(type);
    check(
        `${type} が 1 つある`,
        found.length === 1,
        found.map(([id]) => id),
    );
    return found[0] ?? [undefined, { Properties: {} }];
};

// ---- Lambda ----
// warmup は使わない（CDN に置いてあるので Lambda が動くのは失効後の最初の 1 人だけ・ADR-0017）
const [fnId, fn] = one('AWS::Lambda::Function');
check('Lambda の論理 ID が SsrLambdaFunction', fnId === 'SsrLambdaFunction', fnId);
check(
    '定期実行（AWS::Events::Rule）が無い',
    byType('AWS::Events::Rule').length === 0,
    byType('AWS::Events::Rule').map(([id]) => id),
);
const fp = fn.Properties;
check('Runtime が nodejs24.x', fp.Runtime === 'nodejs24.x', fp.Runtime);
check(
    'Architectures が [arm64]',
    isDeepStrictEqual(fp.Architectures, ['arm64']),
    fp.Architectures,
);
check('MemorySize が 2048', fp.MemorySize === 2048, fp.MemorySize);
check('Timeout が 20', fp.Timeout === 20, fp.Timeout);
check(
    'レイヤーに LambdaAdapterLayerArm64 を含む',
    (fp.Layers ?? []).some(
        (l) =>
            typeof l === 'string' &&
            l.includes(':layer:LambdaAdapterLayerArm64:'),
    ),
    fp.Layers,
);
const env = fp.Environment?.Variables ?? {};
check(
    'AWS_LAMBDA_EXEC_WRAPPER=/opt/bootstrap',
    env.AWS_LAMBDA_EXEC_WRAPPER === '/opt/bootstrap',
    env.AWS_LAMBDA_EXEC_WRAPPER,
);
check(
    'AWS_LWA_PORT=8080',
    String(env.AWS_LWA_PORT) === '8080',
    env.AWS_LWA_PORT,
);
check(
    'AWS_LWA_READINESS_CHECK_PATH=/healthz',
    env.AWS_LWA_READINESS_CHECK_PATH === '/healthz',
    env.AWS_LWA_READINESS_CHECK_PATH,
);
check('PORT=8080', String(env.PORT) === '8080', env.PORT);
check(
    'NODE_ENV=production（500 の本文にスタックを出さない）',
    env.NODE_ENV === 'production',
    env.NODE_ENV,
);

// ---- Function URL ----
const [, url] = one('AWS::Lambda::Url');
check(
    'Function URL の AuthType が AWS_IAM',
    url.Properties.AuthType === 'AWS_IAM',
    url.Properties.AuthType,
);
check(
    'Function URL の InvokeMode が BUFFERED',
    url.Properties.InvokeMode === 'BUFFERED',
    url.Properties.InvokeMode,
);

// ---- 配信の ARN と許可 ----
const [distId, dist] = one('AWS::CloudFront::Distribution');
check(
    '配信の論理 ID が AppCloudFrontDistribution',
    distId === 'AppCloudFrontDistribution',
    distId,
);
const permissions = byType('AWS::Lambda::Permission')
    .map(([, r]) => r.Properties)
    .filter((p) =>
        isDeepStrictEqual(p.FunctionName, {
            'Fn::GetAtt': ['SsrLambdaFunction', 'Arn'],
        }),
    );
check(
    'AWS::Lambda::Permission が 2 つ',
    permissions.length === 2,
    permissions.length,
);
const distArnOk = (sourceArn) =>
    typeof sourceArn?.['Fn::Sub'] === 'string' &&
    sourceArn['Fn::Sub'].includes('${AppCloudFrontDistribution}') &&
    sourceArn['Fn::Sub'].includes('distribution/');
const urlPerm = permissions.find(
    (p) => p.Action === 'lambda:InvokeFunctionUrl',
);
const invokePerm = permissions.find(
    (p) => p.Action === 'lambda:InvokeFunction',
);
check('lambda:InvokeFunctionUrl の許可がある', urlPerm !== undefined);
check(
    'InvokeFunctionUrl の FunctionUrlAuthType が AWS_IAM',
    urlPerm?.FunctionUrlAuthType === 'AWS_IAM',
    urlPerm?.FunctionUrlAuthType,
);
check('lambda:InvokeFunction の許可がある', invokePerm !== undefined);
check(
    'InvokeFunction の InvokedViaFunctionUrl が true',
    invokePerm?.InvokedViaFunctionUrl === true,
    invokePerm?.InvokedViaFunctionUrl,
);
for (const [name, p] of [
    ['InvokeFunctionUrl', urlPerm],
    ['InvokeFunction', invokePerm],
]) {
    check(
        `${name} の Principal が cloudfront.amazonaws.com`,
        p?.Principal === 'cloudfront.amazonaws.com',
        p?.Principal,
    );
    check(
        `${name} の SourceArn が配信の ARN`,
        distArnOk(p?.SourceArn),
        p?.SourceArn,
    );
}

// ---- OAC ----
const oacs = byType('AWS::CloudFront::OriginAccessControl').map(([id, r]) => [
    id,
    r.Properties.OriginAccessControlConfig,
]);
const lambdaOac = oacs.find(
    ([, c]) => c.OriginAccessControlOriginType === 'lambda',
);
const s3Oac = oacs.find(([, c]) => c.OriginAccessControlOriginType === 's3');
check(
    'OAC の OriginAccessControlOriginType が lambda のものがある',
    lambdaOac !== undefined,
    oacs.map(([, c]) => c.OriginAccessControlOriginType),
);
check('S3 の OAC が残っている', s3Oac !== undefined);
check(
    'Lambda の OAC が sigv4・always',
    lambdaOac?.[1].SigningProtocol === 'sigv4' &&
        lambdaOac?.[1].SigningBehavior === 'always',
    lambdaOac?.[1],
);

// ---- キャッシュポリシー ----
const [policyId, policy] = one('AWS::CloudFront::CachePolicy');
const pc = policy.Properties.CachePolicyConfig ?? {};
const pk = pc.ParametersInCacheKeyAndForwardedToOrigin ?? {};
check('MinTTL が 0', pc.MinTTL === 0, pc.MinTTL);
check('MaxTTL が 31536000', pc.MaxTTL === 31536000, pc.MaxTTL);
check('DefaultTTL が 0', pc.DefaultTTL === 0, pc.DefaultTTL);
check(
    'EnableAcceptEncodingGzip が true',
    pk.EnableAcceptEncodingGzip === true,
    pk.EnableAcceptEncodingGzip,
);
check(
    'EnableAcceptEncodingBrotli が true',
    pk.EnableAcceptEncodingBrotli === true,
    pk.EnableAcceptEncodingBrotli,
);
check(
    'CookiesConfig が none',
    pk.CookiesConfig?.CookieBehavior === 'none',
    pk.CookiesConfig,
);
check(
    'HeadersConfig が none',
    pk.HeadersConfig?.HeaderBehavior === 'none',
    pk.HeadersConfig,
);
check(
    'QueryStringsConfig が none',
    pk.QueryStringsConfig?.QueryStringBehavior === 'none',
    pk.QueryStringsConfig,
);

// ---- 配信 ----
const dc = dist.Properties.DistributionConfig ?? {};
const origins = dc.Origins ?? [];
const ssrOrigin = origins.find((o) =>
    isDeepStrictEqual(o.OriginAccessControlId, { Ref: lambdaOac?.[0] }),
);
const s3Origin = origins.find((o) =>
    isDeepStrictEqual(o.OriginAccessControlId, { Ref: s3Oac?.[0] }),
);
check('Lambda の配り元がある（Lambda の OAC を使う）', ssrOrigin !== undefined);
check(
    'Lambda の配り元が https-only',
    ssrOrigin?.CustomOriginConfig?.OriginProtocolPolicy === 'https-only',
    ssrOrigin?.CustomOriginConfig,
);
check(
    'Lambda の配り元の Origin Shield が ap-northeast-1',
    ssrOrigin?.OriginShield?.Enabled === true &&
        ssrOrigin?.OriginShield?.OriginShieldRegion === 'ap-northeast-1',
    ssrOrigin?.OriginShield,
);
check('S3 の配り元がある', s3Origin !== undefined);

const behaviors = dc.CacheBehaviors ?? [];
const def = dc.DefaultCacheBehavior ?? {};
const MANAGED_CACHING_OPTIMIZED = '658327ea-f89d-4fab-a63d-7e88639e58f6';
const api = behaviors.find((b) => b.PathPattern === '/api/*');
check('/api/* の振り分けが残っている', api !== undefined);
check(
    '/api/* が Managed-CachingDisabled',
    api?.CachePolicyId === '4135ea2d-6df8-44a3-9df3-4b5a84be39ad',
    api?.CachePolicyId,
);
check(
    '/api/* が Managed-AllViewerExceptHostHeader',
    api?.OriginRequestPolicyId === 'b689b0a8-53d0-40ab-baf2-68738e2966ac',
    api?.OriginRequestPolicyId,
);

const dot = behaviors.find((b) => b.PathPattern === '*.*');
if (ssrOn) {
    check(
        '既定の振り分けが Lambda の配り元',
        def.TargetOriginId === ssrOrigin?.Id,
        def.TargetOriginId,
    );
    check(
        '既定の振り分けがキャッシュポリシーを使う',
        isDeepStrictEqual(def.CachePolicyId, { Ref: policyId }),
        def.CachePolicyId,
    );
    check(
        '既定の振り分けに OriginRequestPolicy が無い',
        def.OriginRequestPolicyId === undefined,
        def.OriginRequestPolicyId,
    );
    check(
        '既定の振り分けに関数の関連付けが無い',
        def.FunctionAssociations === undefined,
        def.FunctionAssociations,
    );
    check('*.* の振り分けがある', dot !== undefined);
    check(
        '*.* が S3 の配り元',
        dot?.TargetOriginId === s3Origin?.Id,
        dot?.TargetOriginId,
    );
    check(
        '*.* が Managed-CachingOptimized',
        dot?.CachePolicyId === MANAGED_CACHING_OPTIMIZED,
        dot?.CachePolicyId,
    );
    check(
        '*.* に関数の関連付けが無い',
        dot?.FunctionAssociations === undefined,
        dot?.FunctionAssociations,
    );
    check(
        'DefaultRootObject が無い（あると / が S3 の殻に回る）',
        !dc.DefaultRootObject,
        dc.DefaultRootObject,
    );
    check(
        'CustomErrorResponses が無い（/api/* の 5xx まで殻に化けるため。殻への切り替えは server.ts）',
        (dc.CustomErrorResponses ?? []).length === 0,
        dc.CustomErrorResponses,
    );
    check(
        'CacheTagConfig.HeaderName が Cache-Tag',
        dc.CacheTagConfig?.HeaderName === 'Cache-Tag',
        dc.CacheTagConfig,
    );
} else {
    check(
        '既定の振り分けが S3 の配り元',
        def.TargetOriginId === s3Origin?.Id,
        def.TargetOriginId,
    );
    check(
        '既定の振り分けが Managed-CachingOptimized',
        def.CachePolicyId === MANAGED_CACHING_OPTIMIZED,
        def.CachePolicyId,
    );
    check(
        '既定の振り分けが spa-routing を viewer-request に付ける',
        (def.FunctionAssociations ?? []).some(
            (f) => f.EventType === 'viewer-request',
        ),
        def.FunctionAssociations,
    );
    check('*.* の振り分けが無い', dot === undefined);
    check(
        'DefaultRootObject が index.csr.html',
        dc.DefaultRootObject === 'index.csr.html',
        dc.DefaultRootObject,
    );
    check(
        'CustomErrorResponses が無い',
        (dc.CustomErrorResponses ?? []).length === 0,
        dc.CustomErrorResponses,
    );
    check(
        'CacheTagConfig.HeaderName が Cache-Tag（切り戻しでも外さない）',
        dc.CacheTagConfig?.HeaderName === 'Cache-Tag',
        dc.CacheTagConfig,
    );
}

// ---- 別名（prod だけ）----
if (args.stage === 'prod') {
    check(
        'prod の Aliases が v3.sotetsu-lab.com',
        isDeepStrictEqual(dc.Aliases, ['v3.sotetsu-lab.com']),
        dc.Aliases,
    );
    check(
        'prod の ViewerCertificate に ACM がある',
        typeof dc.ViewerCertificate?.AcmCertificateArn === 'string',
        dc.ViewerCertificate,
    );
} else {
    check('stg に Aliases が無い', dc.Aliases === undefined, dc.Aliases);
    check(
        'stg の ViewerCertificate に ACM が無い',
        dc.ViewerCertificate?.AcmCertificateArn === undefined,
        dc.ViewerCertificate,
    );
}

// ---- Outputs ----
for (const name of ['WebBucketName', 'WebDistributionId', 'SsrFunctionUrl']) {
    check(`Outputs に ${name} がある`, template.Outputs?.[name] !== undefined);
}

if (failures.length > 0) {
    console.error(`NG (${args.stage}, ssr=${args.ssr}): ${failures.length} 件`);
    for (const f of failures) {
        console.error(`  - ${f}`);
    }
    process.exit(1);
}
console.log(`OK (${args.stage}, ssr=${args.ssr})`);

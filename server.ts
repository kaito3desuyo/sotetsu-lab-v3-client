import {
    AngularNodeAppEngine,
    createNodeRequestHandler,
    isMainModule,
    writeResponseToNodeResponse,
} from '@angular/ssr/node';
import compression from 'compression';
import express from 'express';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import zlib from 'node:zlib';
import { CACHE_CONTROL } from './src/app/core/ssr/cache-control';

const browserDistFolder = join(import.meta.dirname, '../browser');

// Lambda の応答上限は 6MB。封筒（JSON・base64 を通す余白）を残した値
const SHELL_FALLBACK_BYTES = 5 * 1024 * 1024;

// 起動時に 1 回読む。読めなければ切り替えをせず、描いた HTML をそのまま返す
let shellHtml: string | undefined;
try {
    shellHtml = readFileSync(
        join(browserDistFolder, 'index.csr.html'),
        'utf-8',
    );
} catch {
    shellHtml = undefined;
}

const app = express();
app.disable('x-powered-by');
const angularApp = new AngularNodeAppEngine();

// AWS Lambda Web Adapter の受け口。Angular に渡す前に答える。
// /healthz は LWA の起動確認（AWS_LWA_READINESS_CHECK_PATH）。キャッシュさせない。
app.get('/healthz', (_req, res) => {
    res.set('Cache-Control', CACHE_CONTROL['no-store']).status(200).send('ok');
});

// 描いた HTML を br（品質 5）か gzip（品質 6）にする。1KB 未満は圧縮しない。
app.use(
    compression({
        threshold: 1024,
        level: 6,
        brotli: { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } },
    }),
);

app.use(
    express.static(browserDistFolder, {
        maxAge: '1y',
        index: false,
        redirect: false,
    }),
);

/**
 * 描いた HTML が 5MiB を超え、かつ相手が br も gzip も受け付けないときは、殻に切り替える。
 * 圧縮を受け付ける相手には圧縮後（6MB を大きく下回る）を返せるので、描いた HTML のまま。
 * 殻への切り替えを CloudFront の CustomErrorResponses でなくここで行うのは、
 * CustomErrorResponses が配信全体に効き、/api/*（BFF）の 502〜504 まで殻の 200 に化けるため。
 * 殻は描いた HTML ではないので Cache-Tag は付けず、Cache-Control は short にする。
 */
async function replaceWithShellIfTooLarge(
    req: express.Request,
    response: Response,
): Promise<Response> {
    if (
        shellHtml === undefined ||
        response.status !== 200 ||
        response.body === null ||
        !(response.headers.get('Content-Type') ?? '').includes('text/html') ||
        req.acceptsEncodings('br', 'gzip')
    ) {
        return response;
    }
    // 本文を読み切ると使えなくなるので、読んだ中身で作り直して返す
    const body = await response.arrayBuffer();
    if (body.byteLength <= SHELL_FALLBACK_BYTES) {
        return new Response(body, response);
    }
    return new Response(shellHtml, {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': CACHE_CONTROL.short,
        },
    });
}

/**
 * 描画を 1 本ずつにする列の最後尾。
 * ストアは DI でリクエストごとに別のインスタンスになったので（ADR-0016）、描画が重なっても混ざらない。
 * 列は 2c で同時描画を決めるまで残す、保守的な守り（R14）。列を外して同時に描く確かめ
 * （.context/m29/ssr-concurrent.mjs、2026-10-27）はこのブランチで通り、Elf のビルドでは同じ確かめが落ちた。
 * 本番の Lambda は 1 環境で 1 リクエストずつ受けるのでもともと重ならない。
 * 静的ファイルの配信は express.static が先に受けるので並べない。
 * 直列化・ng-state の書き出しは応答を書く間に進むので、応答を書き終えるまで次を待たせる。
 */
let renderQueue: Promise<void> = Promise.resolve();

app.use((req, res, next) => {
    renderQueue = renderQueue
        .then(async () => {
            try {
                const rendered = await angularApp.handle(req);
                if (!rendered) {
                    next();
                    return;
                }
                const response = await replaceWithShellIfTooLarge(
                    req,
                    rendered,
                );
                // リダイレクトの行き先は時刻や今日で変わりうるので、長く置かない。
                // ただし失敗の途中で出たもの（すでに no-store）は short に戻さない
                if (
                    response.status >= 300 &&
                    response.status < 400 &&
                    response.headers.get('Cache-Control') !==
                        CACHE_CONTROL['no-store']
                ) {
                    response.headers.set('Cache-Control', CACHE_CONTROL.short);
                }
                await writeResponseToNodeResponse(response, res);
            } catch (error) {
                next(error);
            }
        })
        // next(error) が投げても列を rejected のまま残さない（残すと以後の描画が全部止まる）
        .catch(() => undefined);
});

if (isMainModule(import.meta.url)) {
    const port = process.env['PORT'] || 4000;
    app.listen(port, (error) => {
        if (error) {
            throw error;
        }
        console.log(
            `Node Express server listening on http://localhost:${port}`,
        );
    });
}

export const reqHandler = createNodeRequestHandler(app);

import {
    AngularNodeAppEngine,
    createNodeRequestHandler,
    isMainModule,
    writeResponseToNodeResponse,
} from '@angular/ssr/node';
import compression from 'compression';
import express from 'express';
import { join } from 'node:path';
import zlib from 'node:zlib';
import { CACHE_CONTROL } from './src/app/core/ssr/cache-control';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// AWS Lambda Web Adapter の受け口。Angular に渡す前に答える。
// /healthz は LWA の起動確認（AWS_LWA_READINESS_CHECK_PATH）。キャッシュさせない。
app.get('/healthz', (_req, res) => {
    res.set('Cache-Control', CACHE_CONTROL['no-store']).status(200).send('ok');
});
// HTTP でないイベント（warmup など）を LWA が送る先（AWS_LWA_PASS_THROUGH_PATH の既定）。
app.post('/events', (_req, res) => {
    res.status(204).end();
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
                const response = await angularApp.handle(req);
                if (!response) {
                    next();
                    return;
                }
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

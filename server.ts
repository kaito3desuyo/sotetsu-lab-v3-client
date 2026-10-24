import {
    AngularNodeAppEngine,
    createNodeRequestHandler,
    isMainModule,
    writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { CACHE_CONTROL } from './src/app/core/ssr/cache-control';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(
    express.static(browserDistFolder, {
        maxAge: '1y',
        index: false,
        redirect: false,
    }),
);

/**
 * 描画を 1 本ずつにする列の最後尾。
 * Elf のストアはプロセス全体で 1 つで、描画の始めに resetElfStores() が空にする。
 * 2 つの描画が重なると、先の描画の途中でストアが空になり、取得の済んだ一部（運用表の trips など）だけが残った
 * 壊れた HTML が、エラーも出さずに long で CDN に置かれる。
 * 本番の Lambda は 1 環境で 1 リクエストずつ受けるのでもともと重ならない。この列は、手元の確かめと、
 * 並行にリクエストを受ける実行環境（Web Functions など）で壊れた HTML を返さないための守り。
 * 静的ファイルの配信は express.static が先に受けるので並べない。
 * 直列化・ng-state の書き出しは応答を書く間に進むので、応答を書き終えるまで次を待たせる。
 */
let renderQueue: Promise<void> = Promise.resolve();

app.use((req, res, next) => {
    renderQueue = renderQueue.then(async () => {
        try {
            const response = await angularApp.handle(req);
            if (!response) {
                next();
                return;
            }
            // リダイレクトの行き先は時刻や今日で変わりうるので、長く置かない
            if (response.status >= 300 && response.status < 400) {
                response.headers.set('Cache-Control', CACHE_CONTROL.short);
            }
            await writeResponseToNodeResponse(response, res);
        } catch (error) {
            next(error);
        }
    });
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

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

app.use((req, res, next) => {
    angularApp
        .handle(req)
        .then((response) => {
            if (!response) {
                next();
                return;
            }
            // リダイレクトの行き先は時刻や今日で変わりうるので、長く置かない
            if (response.status >= 300 && response.status < 400) {
                response.headers.set('Cache-Control', CACHE_CONTROL.short);
            }
            return writeResponseToNodeResponse(response, res);
        })
        .catch(next);
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

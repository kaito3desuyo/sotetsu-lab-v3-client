import {
    mergeApplicationConfig,
    ApplicationConfig,
    provideAppInitializer,
} from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { resetElfStores } from './core/utils/reset-elf-stores';

const serverConfig: ApplicationConfig = {
    providers: [
        provideServerRendering(
            // サーバーで受ける API の応答の上限。運用表の trips は 3.5MB ほどある。
            // API の Lambda は 6MB までしか返せないので、それより少し大きく取る
            { maxResponseBodySize: 8 * 1024 * 1024 },
            withRoutes(serverRoutes),
        ),
        // サーバーはリクエストごとにアプリを起動し直す。そのたびに前のリクエストのストアを捨てる
        provideAppInitializer(() => resetElfStores()),
    ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);

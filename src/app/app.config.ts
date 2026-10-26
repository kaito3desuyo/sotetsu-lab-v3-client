import {
    HTTP_INTERCEPTORS,
    provideHttpClient,
    withFetch,
    withInterceptorsFromDi,
} from '@angular/common/http';
import {
    ApplicationConfig,
    ErrorHandler,
    importProvidersFrom,
    inject,
    provideAppInitializer,
} from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MatPaginatorIntl } from '@angular/material/paginator';
import {
    provideClientHydration,
    withHttpTransferCacheOptions,
    withIncrementalHydration,
} from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
    provideRouter,
    withEnabledBlockingInitialNavigation,
    withInMemoryScrolling,
    withRouterConfig,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { AdsenseModule } from 'ng2-adsense';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { environment } from 'src/environments/environment';
import { APP_ROUTES } from './app.route';
import { CustomPaginator } from './core/classes/custom-paginator';
import { AuthInterceptor } from './core/interceptors/auth-interceptor';
import { FetchErrorInterceptor } from './core/interceptors/fetch-error.interceptor';
import { NgswBypassInterceptor } from './core/interceptors/ngsw-bypass.interceptor';
import { PayloadHashInterceptor } from './core/interceptors/payload-hash.interceptor';
import { ErrorHandlerService } from './core/services/error-handler.service';
import { isTransferableRequest } from './core/ssr/transfer-cache-filter';
import { WebVitalsReporter } from './core/web-vitals/web-vitals-reporter';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(
            APP_ROUTES,
            withEnabledBlockingInitialNavigation(),
            withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
            // v22 で既定が 'always' に変わった。親ルートの params を子へ流さない従来の挙動を保つ
            withRouterConfig({ paramsInheritanceStrategy: 'emptyOnly' }),
        ),
        // 運用表のカードの @defer に hydrate の条件を付け、サーバーでは中身まで描き、
        // ブラウザは画面に入ったものから引き継ぐ（hydration 前の操作は再生される）。
        // サーバーで取った /v3/ の応答は、API の private 指定があっても HTML に積んでブラウザへ渡す
        // （同じ内容がすでに HTML に描かれており、取り直しを避けるため。対象の絞り込みは transfer-cache-filter）
        provideClientHydration(
            withIncrementalHydration(),
            withHttpTransferCacheOptions({
                includeNonCacheableRequests: true,
                filter: isTransferableRequest,
            }),
        ),
        provideHttpClient(withFetch(), withInterceptorsFromDi()),
        provideAnimations(),
        provideServiceWorker('ngsw-worker.js', {
            enabled: environment.production,
        }),
        importProvidersFrom(
            AdsenseModule.forRoot({
                adClient: 'ca-pub-8923857677281403',
                fullWidthResponsive: false,
            }),
            LoggerModule.forRoot({
                level: environment.production
                    ? NgxLoggerLevel.OFF
                    : NgxLoggerLevel.DEBUG,
                serverLogLevel: NgxLoggerLevel.OFF,
            }),
        ),
        { provide: ErrorHandler, useClass: ErrorHandlerService },
        provideAppInitializer(() => inject(WebVitalsReporter).start()),
        // 先に登録した方が外側。失敗を FetchError に直すのは、AuthInterceptor が 401 で取り直した後
        {
            provide: HTTP_INTERCEPTORS,
            useClass: FetchErrorInterceptor,
            multi: true,
        },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: PayloadHashInterceptor,
            multi: true,
        },
        // 書き込み後の 1 時間（cache: 'reload'）は Service Worker を通さない
        {
            provide: HTTP_INTERCEPTORS,
            useClass: NgswBypassInterceptor,
            multi: true,
        },
        { provide: MatPaginatorIntl, useClass: CustomPaginator },
        // G0-1: mat-form-field を全ページ outlined 既定にする（98 G0-1。
        // 従来の fill/underline を上書き。個別ページでの appearance 明示は不要）
        {
            provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
            useValue: { appearance: 'outline' },
        },
    ],
};

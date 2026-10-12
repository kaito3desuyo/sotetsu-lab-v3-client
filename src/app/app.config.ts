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
} from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MatPaginatorIntl } from '@angular/material/paginator';
import {
    provideClientHydration,
    withNoIncrementalHydration,
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
import { PayloadHashInterceptor } from './core/interceptors/payload-hash.interceptor';
import { ErrorHandlerService } from './core/services/error-handler.service';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(
            APP_ROUTES,
            withEnabledBlockingInitialNavigation(),
            withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
            // v22 で既定が 'always' に変わった。親ルートの params を子へ流さない従来の挙動を保つ
            withRouterConfig({ paramsInheritanceStrategy: 'emptyOnly' }),
        ),
        provideClientHydration(withNoIncrementalHydration()),
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
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: PayloadHashInterceptor,
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

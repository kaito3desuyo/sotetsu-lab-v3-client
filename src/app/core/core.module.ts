import { DOCUMENT, ViewportScroller } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ErrorHandler, NgModule, ɵɵinject } from '@angular/core';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { AkitaNgDevtools } from '@datorama/akita-ngdevtools';
import {
    RxRenderStrategiesConfig,
    RX_RENDER_STRATEGIES_CONFIG,
} from '@rx-angular/cdk/render-strategies';
import { AdsenseModule } from 'ng2-adsense';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { environment } from 'src/environments/environment';
import { ConfirmDialogModule } from '../shared/confirm-dialog/confirm-dialog.module';
import { CustomPaginator } from './classes/custom-paginator';
import { CustomViewportScroller } from './classes/custom-viewport-scroller';
import { AppInitializerProvider } from './configs/app-initializer';
import { AuthInterceptor } from './interceptors/auth-interceptor';
import { ErrorHandlerService } from './services/error-handler.service';

const CUSTOM_RX_ANGULAR_CONFIG: RxRenderStrategiesConfig<string> = {
    primaryStrategy: 'local',
    patchZone: true,
};

@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        HttpClientModule,
        ServiceWorkerModule.register('ngsw-worker.js', {
            enabled: environment.production,
        }),
        AdsenseModule.forRoot({
            adClient: 'ca-pub-8923857677281403',
            fullWidthResponsive: false,
        }),
        environment.production ? [] : AkitaNgDevtools.forRoot(),
        LoggerModule.forRoot({
            level: environment.production
                ? NgxLoggerLevel.OFF
                : NgxLoggerLevel.DEBUG,
            serverLogLevel: NgxLoggerLevel.OFF,
        }),
        ConfirmDialogModule,
        MatSnackBarModule,
    ],
    providers: [
        AppInitializerProvider,
        {
            provide: ErrorHandler,
            useClass: ErrorHandlerService,
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthInterceptor,
            multi: true,
        },
        { provide: MAT_DATE_LOCALE, useValue: 'ja-JP' },
        {
            provide: MatPaginatorIntl,
            useClass: CustomPaginator,
        },
        {
            provide: ViewportScroller,
            useFactory: () =>
                new CustomViewportScroller(
                    'content-scroller',
                    ɵɵinject(DOCUMENT),
                    window,
                    ɵɵinject(ErrorHandler)
                ),
        },
        {
            provide: RX_RENDER_STRATEGIES_CONFIG,
            useValue: CUSTOM_RX_ANGULAR_CONFIG,
        },
    ],
})
export class CoreModule {}

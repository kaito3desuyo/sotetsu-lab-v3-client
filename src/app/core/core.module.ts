import {
    HTTP_INTERCEPTORS,
    provideHttpClient,
    withInterceptorsFromDi,
} from '@angular/common/http';
import { ErrorHandler, NgModule } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { AkitaNgDevtools } from '@datorama/akita-ngdevtools';
import {
    RX_RENDER_STRATEGIES_CONFIG,
    RxRenderStrategiesConfig,
} from '@rx-angular/cdk/render-strategies';
import { AdsenseModule } from 'ng2-adsense';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { environment } from 'src/environments/environment';
import { CustomPaginator } from './classes/custom-paginator';
import { AppInitializerProvider } from './configs/app-initializer';
import { AuthInterceptor } from './interceptors/auth-interceptor';
import { PayloadHashInterceptor } from './interceptors/payload-hash.interceptor';
import { ErrorHandlerService } from './services/error-handler.service';

const CUSTOM_RX_ANGULAR_CONFIG: RxRenderStrategiesConfig<string> = {
    primaryStrategy: 'local',
    patchZone: true,
};

@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
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
        {
            provide: HTTP_INTERCEPTORS,
            useClass: PayloadHashInterceptor,
            multi: true,
        },
        {
            provide: MatPaginatorIntl,
            useClass: CustomPaginator,
        },
        // {
        //     provide: ViewportScroller,
        //     useFactory: () =>
        //         new CustomViewportScroller(
        //             'content-scroller',
        //             ɵɵinject(DOCUMENT),
        //             window,
        //             ɵɵinject(ErrorHandler)
        //         ),
        // },
        {
            provide: RX_RENDER_STRATEGIES_CONFIG,
            useValue: CUSTOM_RX_ANGULAR_CONFIG,
        },
        provideHttpClient(withInterceptorsFromDi()),
    ],
})
export class CoreModule {}

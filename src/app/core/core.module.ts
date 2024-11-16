import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { ErrorHandler, NgModule } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { AdsenseModule } from 'ng2-adsense';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { environment } from 'src/environments/environment';
import { CustomPaginator } from './classes/custom-paginator';
import { AuthInterceptor } from './interceptors/auth-interceptor';
import { PayloadHashInterceptor } from './interceptors/payload-hash.interceptor';
import { ErrorHandlerService } from './services/error-handler.service';

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
        LoggerModule.forRoot({
            level: environment.production
                ? NgxLoggerLevel.OFF
                : NgxLoggerLevel.DEBUG,
            serverLogLevel: NgxLoggerLevel.OFF,
        }),
        MatSnackBarModule,
    ],
    providers: [
        // AppInitializerProvider,
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
    ],
})
export class CoreModule {}

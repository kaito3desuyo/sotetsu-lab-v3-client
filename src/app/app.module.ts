import { DOCUMENT, ViewportScroller } from '@angular/common';
import { ErrorHandler, NgModule, ɵɵinject } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { AkitaNgDevtools } from '@datorama/akita-ngdevtools';
import { AdsenseModule } from 'ng2-adsense';
import { environment } from '../environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CustomViewportScroller } from './core/classes/custom-viewport-scroller';
import { AppInitializerProvider } from './core/configs/app-initializer';
import { GeneralModule } from './general/general.module';
import { LayoutModule } from './layout/layout.module';
import { AppSharedModule } from './shared/app-shared/app-shared.module';
import { ConfirmDialogModule } from './shared/confirm-dialog/confirm-dialog.module';

@NgModule({
    declarations: [AppComponent],
    providers: [
        AppInitializerProvider,
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
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        LayoutModule,
        AppSharedModule,
        GeneralModule,
        environment.production ? [] : AkitaNgDevtools.forRoot(),
        ServiceWorkerModule.register('ngsw-worker.js', {
            enabled: environment.production,
        }),
        AdsenseModule.forRoot({
            adClient: 'ca-pub-8923857677281403',
            fullWidthResponsive: false,
        }),
        ConfirmDialogModule,
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}

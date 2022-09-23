import { DOCUMENT, ViewportScroller } from '@angular/common';
import {
    APP_INITIALIZER,
    ErrorHandler,
    NgModule,
    ɵɵinject,
} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { AkitaNgDevtools } from '@datorama/akita-ngdevtools';
import { AdsenseModule } from 'ng2-adsense';
import { environment } from '../environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CustomViewportScroller } from './core/classes/custom-viewport-scroller';
import { TokenService } from './core/token/token.service';
import { GeneralModule } from './general/general.module';
import { AgencyListStateStoreProvider } from './global-states/agency-list.state';
import { CalendarListStateStoreProvider } from './global-states/calendar-list.state';
import { RouteStationListStateStoreProvider } from './global-states/route-station-list.state';
import { ServiceListStateStoreProvider } from './global-states/service-list.state';
import { TodaysCalendarListStateStore } from './global-states/todays-calendar-list.state';
import { TodaysOperationListStateStore } from './global-states/todays-operation-list.state';
import { LayoutModule } from './layout/layout.module';
import { AppSharedModule } from './shared/app-shared/app-shared.module';
import { ConfirmDialogModule } from './shared/confirm-dialog/confirm-dialog.module';

@NgModule({
    declarations: [AppComponent],
    providers: [
        {
            provide: APP_INITIALIZER,
            useFactory: (tokenService: TokenService) => () =>
                tokenService.fetchToken().toPromise(),
            deps: [TokenService],
            multi: true,
        },
        AgencyListStateStoreProvider,
        CalendarListStateStoreProvider,
        RouteStationListStateStoreProvider,
        ServiceListStateStoreProvider,
        {
            provide: APP_INITIALIZER,
            useFactory:
                (
                    todaysCalendarListStateStore: TodaysCalendarListStateStore,
                    todaysOperationListStateStore: TodaysOperationListStateStore
                ) =>
                () => {
                    return Promise.resolve()
                        .then(() =>
                            todaysCalendarListStateStore.fetch().toPromise()
                        )
                        .then(() =>
                            todaysOperationListStateStore.fetch().toPromise()
                        );
                },
            deps: [TodaysCalendarListStateStore, TodaysOperationListStateStore],
            multi: true,
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

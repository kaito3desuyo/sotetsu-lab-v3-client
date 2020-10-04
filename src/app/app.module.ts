import { BrowserModule } from '@angular/platform-browser';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LayoutModule } from './layout/layout.module';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { GeneralModule } from './general/general.module';
import { AkitaNgDevtools } from '@datorama/akita-ngdevtools';
import { AppSharedModule } from './shared/app-shared/app-shared.module';
import { AdsenseModule } from 'ng2-adsense';
import { TokenService } from './core/token/token.service';

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
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}

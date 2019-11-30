import { BrowserModule } from '@angular/platform-browser';
import { NgModule, ErrorHandler } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LayoutModule } from './layout/layout.module';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { GeneralModule } from './general/general.module';
import { AkitaNgDevtools } from '@datorama/akita-ngdevtools';
import { AppSharedModule } from './shared/app-shared/app-shared.module';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';

const socketConfig: SocketIoConfig = {
    url: environment.socketUrl,
    options: {}
};

@NgModule({
    declarations: [AppComponent],
    imports: [
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        LayoutModule,
        AppSharedModule,
        GeneralModule,
        environment.production ? [] : AkitaNgDevtools.forRoot(),
        ServiceWorkerModule.register('ngsw-worker.js', {
            enabled: environment.production
        }),
        SocketIoModule.forRoot(socketConfig)
    ],
    bootstrap: [AppComponent]
})
export class AppModule {}

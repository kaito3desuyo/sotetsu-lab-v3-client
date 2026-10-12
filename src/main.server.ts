import { enableProdMode, provideZoneChangeDetection } from '@angular/core';
import {
    bootstrapApplication,
    BootstrapContext,
} from '@angular/platform-browser';
import { enableElfProdMode } from '@ngneat/elf';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';
import { environment } from './environments/environment';

if (environment.production) {
    enableProdMode();
    enableElfProdMode();
}

const bootstrap = (context: BootstrapContext) =>
    bootstrapApplication(
        AppComponent,
        {
            ...config,
            providers: [provideZoneChangeDetection(), ...config.providers],
        },
        context,
    );

export default bootstrap;

import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { enableElfProdMode } from '@ngneat/elf';
import { devTools } from '@ngneat/elf-devtools';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import localForage from 'localforage';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

localForage.config({
    driver: localForage.INDEXEDDB,
    name: 'sotetsu-lab-v3-client',
    version: 1.0,
    storeName: 'elf_state',
});

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

if (environment.production) {
    enableProdMode();
    enableElfProdMode();
} else {
    devTools();
}

gtag('js', new Date());
gtag('config', environment.analytics.id, { send_page_view: false });

bootstrapApplication(AppComponent, appConfig).catch((err) =>
    console.error(err),
);

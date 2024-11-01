import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

gtag('js', new Date());
gtag('config', environment.analytics.id, { send_page_view: false });

if (environment.production) {
    enableProdMode();
}

bootstrapApplication(AppComponent, appConfig).catch((err) =>
    console.error(err),
);

import { enableProdMode, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { AppComponent } from './app/app.component';
import { APP_ROUTES } from './app/app.route';
import { CoreModule } from './app/core/core.module';
import { environment } from './environments/environment';

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

gtag('js', new Date());
gtag('config', environment.analytics.id, { send_page_view: false });

if (environment.production) {
    enableProdMode();
}

bootstrapApplication(AppComponent, {
    providers: [
        provideRouter(
            APP_ROUTES,
            withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
        ),
        importProvidersFrom([CoreModule]),
    ],
}).catch((err) => console.error(err));

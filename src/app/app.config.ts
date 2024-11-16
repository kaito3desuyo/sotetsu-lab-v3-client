import {
    provideHttpClient,
    withFetch,
    withInterceptors,
    withInterceptorsFromDi,
} from '@angular/common/http';
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
    provideRouter,
    withEnabledBlockingInitialNavigation,
    withInMemoryScrolling,
} from '@angular/router';
import { APP_ROUTES } from './app.route';
import { CoreModule } from './core/core.module';
import { maintenanceInterceptor } from './core/interceptors/maintenance.interceptor';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(
            APP_ROUTES,
            withEnabledBlockingInitialNavigation(),
            withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
        ),
        provideClientHydration(),
        provideHttpClient(
            withFetch(),
            withInterceptorsFromDi(),
            withInterceptors([maintenanceInterceptor]),
        ),
        provideAnimations(),
        importProvidersFrom([CoreModule]),
    ],
};

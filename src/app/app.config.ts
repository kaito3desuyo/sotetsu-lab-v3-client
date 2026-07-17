import {
    provideHttpClient,
    withFetch,
    withInterceptorsFromDi,
} from '@angular/common/http';
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
    provideRouter,
    withEnabledBlockingInitialNavigation,
    withInMemoryScrolling,
} from '@angular/router';
import { APP_ROUTES } from './app.route';
import { CoreModule } from './core/core.module';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(
            APP_ROUTES,
            withEnabledBlockingInitialNavigation(),
            withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
        ),
        provideClientHydration(),
        provideHttpClient(withFetch(), withInterceptorsFromDi()),
        provideAnimations(),
        importProvidersFrom([CoreModule]),
        // G0-1: mat-form-field を全ページ outlined 既定にする（98 G0-1。
        // 従来の fill/underline を上書き。個別ページでの appearance 明示は不要）
        {
            provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
            useValue: { appearance: 'outline' },
        },
    ],
};

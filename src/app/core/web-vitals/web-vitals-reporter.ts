import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { type Metric, onCLS, onINP, onLCP } from 'web-vitals';
import { GoogleAnalyticsService } from '../services/google-analytics.service';
import { toWebVitalsEvent } from './to-web-vitals-event';

/**
 * Core Web Vitals（LCP・INP・CLS）を測って GA に送る係
 */
@Injectable({ providedIn: 'root' })
export class WebVitalsReporter {
    readonly #ga = inject(GoogleAnalyticsService);
    readonly #platformId = inject(PLATFORM_ID);

    start(): void {
        // 測るのはブラウザの描画。サーバーには PerformanceObserver が無い
        if (!isPlatformBrowser(this.#platformId)) {
            return;
        }

        const send = (metric: Metric) => {
            const event = toWebVitalsEvent(metric);
            if (event) {
                this.#ga.sendEvent(event.name, event.params);
            }
        };

        onLCP(send);
        onINP(send);
        onCLS(send);
    }
}

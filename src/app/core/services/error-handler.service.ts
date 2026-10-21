import { ErrorHandler, Injectable, inject } from '@angular/core';
import ErrorStackParser from 'error-stack-parser';
import { NGXLogger } from 'ngx-logger';
import { toErrorMessage } from '../errors/to-error-message';
import { GoogleAnalyticsService } from './google-analytics.service';

@Injectable({
    providedIn: 'root',
})
export class ErrorHandlerService implements ErrorHandler {
    readonly #logger = inject(NGXLogger);
    readonly #ga = inject(GoogleAnalyticsService);
    /** 同じエラーで GA のイベントを埋めないよう、送ったものを覚えておく */
    readonly #sentErrorMessages = new Set<string>();

    handleError<T extends Error>(error: T): void {
        this.#sendToGA(error);

        if (error instanceof Error) {
            this.#logger.error(error.name, error.message, {
                ...error,
                stack: ErrorStackParser.parse(error),
            });
        }
    }

    #sendToGA(error: unknown): void {
        if (!(error instanceof Error)) {
            return;
        }

        const message = toErrorMessage(error);
        if (this.#sentErrorMessages.has(message)) {
            return;
        }
        this.#sentErrorMessages.add(message);

        this.#ga.sendEvent('app_error', { error_message: message });
    }
}

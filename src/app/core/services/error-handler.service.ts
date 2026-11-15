import { ErrorHandler, Injectable, inject } from '@angular/core';
import ErrorStackParser from 'error-stack-parser';
import { NGXLogger } from 'ngx-logger';
import { isChunkLoadError } from '../errors/chunk-load-error';
import { toErrorMessage } from '../errors/to-error-message';
import { GoogleAnalyticsService } from './google-analytics.service';
import { StaleChunkReload } from './stale-chunk-reload';

@Injectable({
    providedIn: 'root',
})
export class ErrorHandlerService implements ErrorHandler {
    readonly #logger = inject(NGXLogger);
    readonly #ga = inject(GoogleAnalyticsService);
    readonly #staleChunkReload = inject(StaleChunkReload);
    /** 同じエラーで GA のイベントを埋めないよう、送ったものを覚えておく */
    readonly #sentErrorMessages = new Set<string>();

    handleError<T extends Error>(error: T): void {
        this.#sendToGA(error);
        // 画面の移動の外（@defer など）で古い版の部品が読めなかったら、今の画面を読み込み直して新しい版にする
        if (isChunkLoadError(error)) {
            this.#staleChunkReload.reloadCurrent();
        }

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

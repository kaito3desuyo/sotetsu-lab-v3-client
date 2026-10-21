import { HttpErrorResponse } from '@angular/common/http';
import { CustomError } from 'ts-custom-error';

const UNKNOWN_ERROR_MESSAGE = '不明なエラーが発生しました';

export class FetchError extends CustomError {
    constructor(
        readonly statusCode: number,
        readonly message: string,
        readonly context: Record<string, unknown> = {},
        readonly url: string | null = null,
        readonly body: unknown = null,
    ) {
        super(message);
        Object.defineProperty(this, 'name', { value: 'FetchError' });
    }

    /**
     * HttpClient の失敗を Error の仲間に直す。
     * HttpErrorResponse は Error を implements しているだけなので instanceof Error が偽になり、
     * GA にも ErrorHandler にも中身が残らなかった
     */
    static fromHttpErrorResponse(error: HttpErrorResponse): FetchError {
        return new FetchError(
            error.status,
            toMessage(error.error),
            {},
            error.url,
            error.error,
        );
    }
}

/** API の本文の message を取り出す。入力検証（NestJS）では配列で来る */
function toMessage(body: unknown): string {
    const message =
        typeof body === 'object' && body !== null && 'message' in body
            ? body.message
            : undefined;

    if (typeof message === 'string' && message !== '') {
        return message;
    }
    if (Array.isArray(message) && message.length > 0) {
        return message.join('、');
    }
    return UNKNOWN_ERROR_MESSAGE;
}

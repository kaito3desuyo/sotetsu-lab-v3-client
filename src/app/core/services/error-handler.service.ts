import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable } from '@angular/core';
import ErrorStackParser from 'error-stack-parser';
import { NGXLogger } from 'ngx-logger';

@Injectable({
    providedIn: 'root',
})
export class ErrorHandlerService implements ErrorHandler {
    constructor(private readonly logger: NGXLogger) {}

    handleError<T extends Error>(error: T): void {
        if (error instanceof HttpErrorResponse) {
            this.logger.error(error.name, error.message, { ...error });
        }

        if (error instanceof Error) {
            this.logger.error(error.name, error.message, {
                ...error,
                stack: ErrorStackParser.parse(error),
            });
        }
    }
}

import { ErrorHandler, Injectable } from '@angular/core';
import ErrorStackParser from 'error-stack-parser';
import { NGXLogger } from 'ngx-logger';

@Injectable({
    providedIn: 'root',
})
export class ErrorHandlerService implements ErrorHandler {
    constructor(private readonly logger: NGXLogger) {}

    handleError<T extends Error>(error: T): void {
        this.logger.error(
            error.name,
            error.message,
            '\n',
            JSON.stringify(
                { stack: ErrorStackParser.parse(error) },
                undefined,
                2
            )
        );
    }
}

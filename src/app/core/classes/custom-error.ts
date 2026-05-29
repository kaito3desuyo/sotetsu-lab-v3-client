import { CustomError } from 'ts-custom-error';

export class FetchError extends CustomError {
    constructor(
        readonly statusCode: number,
        readonly message: string,
        readonly context: Record<string, unknown> = {},
    ) {
        super(message);
        Object.defineProperty(this, 'name', { value: 'FetchError' });
    }
}

import { FetchError } from '../classes/custom-error';

/** GA のイベントの値は 100 文字まで */
const GA_VALUE_MAX_LENGTH = 100;

/** page_load_error・app_error に載せるエラーの文 */
export function toErrorMessage(error: unknown): string {
    return describe(error).slice(0, GA_VALUE_MAX_LENGTH);
}

function describe(error: unknown): string {
    if (error instanceof FetchError) {
        const path = error.url
            ? ` ${new URL(error.url, 'http://localhost').pathname}`
            : '';
        return `${error.name} ${error.statusCode}${path}: ${error.message}`;
    }
    if (error instanceof Error) {
        return `${error.name}: ${error.message}`;
    }
    return String(error);
}

import { parseUuid } from './url-params/url-param';

/**
 * URL の ID（calendar_id など）を UUID として読む。UUID でないもの（無い・"undefined" など）は null。
 * 新しいコードは url-params/url-param.ts の readUrlParam と parseUuid を使う。
 */
export function parseUuidParam(raw: string | null): string | null {
    return raw === null ? null : parseUuid(raw);
}

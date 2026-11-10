const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * URL の ID（calendar_id など）を UUID として読む。UUID でないもの（無い・"undefined" など）は null。
 * Angular は matrix の値の undefined を "undefined" と書くので、そのまま API に送ると 422 になる
 * （2026-11-07 の本番。api は 2026-11-10 まで 500 を返していた）。
 */
export function parseUuidParam(raw: string | null): string | null {
    return raw !== null && UUID_PATTERN.test(raw) ? raw : null;
}

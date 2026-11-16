function segmentsOf(path: string): string[] {
    const withoutQuery = path.split(/[?#]/, 1)[0];
    return withoutQuery
        .split('/')
        .map((segment) => segment.split(';', 1)[0])
        .filter((segment) => segment !== '');
}

/**
 * URL の path から、ページ本体の chunk の href を引く。
 * 表の鍵（`/timetable/station`・`/moderation/users/:userId`）のうち、segment ごとに頭から一致する
 * 一番長いものを使う。`;` 以降（matrix params）・クエリ・末尾の `/` は見ない。
 * `:x` の segment は何にでも当たる。ルート（`/`）の鍵は `/` そのものにだけ当たる。
 * 表に無い path は null（`/` の先頭一致で見つからないページに当てない）。
 */
export function routePreloadFor(
    path: string,
    table: Readonly<Record<string, string>>,
): string | null {
    const segments = segmentsOf(path);
    let best: { length: number; href: string } | null = null;
    for (const [key, href] of Object.entries(table)) {
        const keySegments = segmentsOf(key);
        const matches =
            keySegments.length === 0
                ? segments.length === 0
                : keySegments.length <= segments.length &&
                  keySegments.every(
                      (segment, index) =>
                          segment.startsWith(':') ||
                          segment === segments[index],
                  );
        if (matches && (best === null || keySegments.length > best.length)) {
            best = { length: keySegments.length, href };
        }
    }
    return best?.href ?? null;
}

/** route-preloads.json の中身が `{ 鍵: 文字列 }` のときだけ表にする */
export function parseRoutePreloadTable(
    json: unknown,
): Record<string, string> | null {
    if (typeof json !== 'object' || json === null || Array.isArray(json)) {
        return null;
    }
    const table: Record<string, string> = {};
    for (const [key, value] of Object.entries(json)) {
        if (typeof value === 'string') {
            table[key] = value;
        }
    }
    return Object.keys(table).length > 0 ? table : null;
}

/**
 * 返す項目の組（資源 → 項目名）を、API の `fields[資源]=項目,項目` のクエリパラメータにする。
 */
export const toFieldsParams = (
    fields: Readonly<Record<string, readonly string[]>>,
): Record<string, string> =>
    Object.fromEntries(
        Object.entries(fields).map(([resource, names]) => [
            `fields[${resource}]`,
            names.join(','),
        ]),
    );

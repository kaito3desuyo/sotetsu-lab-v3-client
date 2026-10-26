/**
 * 返す項目の選択（API の `fields[資源]=項目,項目`。sotetsu-lab-v3-api docs/adr/0010-v3-include-and-fields.md）。
 * 時刻断面の口は include を受けない（付けると 400）。挙げない資源は全項目のまま返る。
 * fields を指定すると値が null の項目は省かれる。
 */

/** 中の運用・編成の時刻印だけ外す。目撃そのものの時刻印は「更新」の表示に使うので残す。 */
export const TIME_CROSS_SECTION_FIELDS: Readonly<
    Record<string, readonly string[]>
> = {
    operation: ['operationId', 'calendarId', 'operationNumber'],
    formation: [
        'formationId',
        'agencyId',
        'vehicleType',
        'formationNumber',
        'formationDescription',
        'startDate',
        'endDate',
    ],
};

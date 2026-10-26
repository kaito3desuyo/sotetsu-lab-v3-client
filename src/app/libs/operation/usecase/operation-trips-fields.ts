/**
 * 返す項目の選択（API の `include`・`fields[資源]=項目,項目`。sotetsu-lab-v3-api docs/adr/0010-v3-include-and-fields.md）。
 * fields を指定すると値が null の項目は省かれ、空で送った資源は id だけになる。
 */

/** 運用表の取得で結合する関連の道筋。種別・ダイヤは結合しない。 */
export const OPERATION_TABLE_INCLUDE =
    'trips.trip,trips.startTime,trips.endTime';

/** 運用表が読む項目。運用区間（tripOperationList）は id だけ返させる。 */
export const OPERATION_TABLE_FIELDS: Readonly<
    Record<string, readonly string[]>
> = {
    operation: ['operationNumber'],
    tripOperationList: [],
    trip: [
        'tripNumber',
        'tripDirection',
        'tripBlockId',
        'tripClassId',
        'depotIn',
        'depotOut',
    ],
    time: ['stationId', 'arrivalTime', 'departureTime'],
};

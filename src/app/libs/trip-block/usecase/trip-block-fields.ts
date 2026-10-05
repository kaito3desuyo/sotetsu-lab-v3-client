/**
 * 返す項目の選択（API の `fields[資源]=項目,項目`。sotetsu-lab-v3-api docs/adr/0002-v3-sparse-fieldsets.md）。
 * 資源名は trip / time / tripOperationList / operation / tripClass。指定しなければ全項目。
 * trip-block と trip の id は常に返る。fields を指定すると値が null の項目は省かれる。
 */
export type TripBlockFields = Readonly<Record<string, readonly string[]>>;

/**
 * 時刻表の線を引くページ（列車位置情報・列車ダイヤグラム）が使う項目の組。
 * 両ページで同じ組を使うと、取得結果のキャッシュ（fields ごと）を共有できる。
 * 種別の中身は取らず、呼び出し側で `attachTripClasses`（shared）を通して補う。
 */
export const TRIP_BLOCK_TIMELINE_FIELDS: TripBlockFields = {
    trip: [
        'tripNumber',
        'tripDirection',
        'tripBlockId',
        'tripClassId',
        'depotIn',
        'depotOut',
    ],
    time: [
        'stationId',
        'stopSequence',
        'arrivalDays',
        'arrivalTime',
        'departureDays',
        'departureTime',
    ],
    tripOperationList: ['operationId'],
    operation: ['operationNumber'],
};

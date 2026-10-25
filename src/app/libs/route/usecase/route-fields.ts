/**
 * 返す項目の選択（API の `include`・`fields[資源]=項目,項目`。sotetsu-lab-v3-api docs/adr/0010-v3-include-and-fields.md）。
 * fields を指定すると値が null の項目は省かれる。
 */
export type RouteFields = Readonly<Record<string, readonly string[]>>;

/** 起動時に取る路線と駅の一覧が使う項目。 */
export const ROUTE_STATION_LIST_FIELDS: RouteFields = {
    route: [
        'agencyId',
        'routeNumber',
        'routeName',
        'routeDescription',
        'routeType',
        'routeUrl',
        'routeColor',
        'routeTextColor',
    ],
    routeStationList: [
        'routeId',
        'stationId',
        'stationSequence',
        'stationNumbering',
    ],
    station: [
        'stationName',
        'stationSubname',
        'stationType',
        'stationDescription',
        'stationLatlng',
        'stationUrl',
        'wheelchairBoarding',
    ],
};

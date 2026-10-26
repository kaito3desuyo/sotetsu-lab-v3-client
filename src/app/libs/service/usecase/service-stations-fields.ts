/**
 * 返す項目の選択（API の `include`・`fields[資源]=項目,項目`。sotetsu-lab-v3-api docs/adr/0010-v3-include-and-fields.md）。
 * fields を指定すると値が null の項目は省かれる。
 */
export type ServiceStationsFields = Readonly<Record<string, readonly string[]>>;

/**
 * 運行系統の駅一覧（`GET /v3/services/:id/stations`）で結合する関連。
 * 駅の路線（routeStationLists）と、その路線（route）だけを付ける。停留所（stops）・時刻印は付けない。
 */
export const SERVICE_STATIONS_INCLUDE = 'stations.routeStationLists.route';

/**
 * 運行系統の駅一覧が使う項目。
 * 呼び出し元 5 ページ（全線時刻表・時刻表の編集・行路図・real-time・ダイヤグラム）が読む項目の和集合。
 * ページを足したり、読む項目を増やしたりしたら、ここにも足すこと（足し忘れた項目は常に undefined になる）。
 * この形では応答に `service` が付かない。
 */
export const SERVICE_STATIONS_FIELDS: ServiceStationsFields = {
    station: ['stationName'],
    routeStationList: ['routeId', 'stationSequence', 'stationNumbering'],
    route: ['routeName', 'agencyId'],
};

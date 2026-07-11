import { TrainLocationCard } from './train-location-card.interface';

export interface TrainLocationInterchangeRoute {
    routeId: string;
    routeName: string;
}

export interface TrainLocationStationRow {
    kind: 'station';
    stationId: string;
    stationName: string;
    /** 主要駅（優等停車駅）か。大ノード+太字表示に使う */
    isMajor: boolean;
    /** 上り（左側）の停車中カード */
    leftCards: TrainLocationCard[];
    /** 下り（右側）の停車中カード */
    rightCards: TrainLocationCard[];
    /** 乗換可能な他路線（選択中の路線は含まない）。無ければ空配列 */
    interchangeRoutes: TrainLocationInterchangeRoute[];
}

export interface TrainLocationBetweenCardEntry {
    card: TrainLocationCard;
    /** 駅間ゾーン内の縦位置（0=区間の先頭駅側、1=区間の次駅側）。線形補間。 */
    topProgress: number;
}

export interface TrainLocationBetweenRow {
    kind: 'between';
    /** 駅軸の昇順（stationSequence 昇順）で見た区間の先頭駅 */
    fromStationId: string;
    /** 駅軸の昇順で見た区間の次駅 */
    toStationId: string;
    leftCards: TrainLocationBetweenCardEntry[];
    rightCards: TrainLocationBetweenCardEntry[];
}

export type TrainLocationRow = TrainLocationStationRow | TrainLocationBetweenRow;

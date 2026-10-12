/** 「次の運用」に選べる運用区間（車両が運番を離れて次に入る区間） */
export class NextSegmentCandidateDto {
    tripOperationListId: string;
    tripId: string;
    operationId: string;
    operationNumber: string;
    startStationId: string;
    /** 発時刻（運行日の 0 時からの秒。2 日目は 86400 以上） */
    startSeconds: number;
    /** すでにほかの区間の「次」になっている、または列車の途中でつながる（決まり 1）行き元がある */
    isTaken: boolean;
    /** isTaken の内訳: 列車の途中でつながる（決まり 1）行き元があるため選べない */
    isFixedByTripBlock: boolean;
}

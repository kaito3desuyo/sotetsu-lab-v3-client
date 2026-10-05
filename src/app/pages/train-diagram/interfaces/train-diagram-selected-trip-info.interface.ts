export interface TrainDiagramSelectedTripInfo {
    tripId: string;
    tripNumber: string;
    tripClassName: string;
    tripClassColor: string;
    destinationName: string;
    operationId?: string;
    operationNumber?: string;
    /** 目撃クロスセクション由来。今日有効ダイヤのみ・取得不能なら undefined（非表示） */
    formationNumber?: string;
    /**
     * 編成の目撃日時（ISO 文字列）。formationNumber と同じ expectedSighting 由来。
     * モックのカード型情報パネルの「（目撃 07/03）」表記に使う（G7）。
     */
    sightingTime?: string;
    detailLink: [string, string, Record<string, string>];
}

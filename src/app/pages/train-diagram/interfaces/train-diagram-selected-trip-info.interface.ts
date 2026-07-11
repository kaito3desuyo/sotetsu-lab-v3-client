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
    detailLink: [string, string, Record<string, string>];
}

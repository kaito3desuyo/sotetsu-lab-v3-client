import { StoppedReason } from 'src/app/shared/train-position.util';

/**
 * 列車カード（N2 列車位置情報）の表示用データ。tripId ごとに 1 件、
 * 位置（停車中/駅間）とは独立に静的な列車属性のみを保持する（stoppedReason だけは位置から付ける）。
 */
export interface TrainLocationCard {
    tripId: string;
    tripNumber: string;
    tripClassName: string;
    tripClassColor: string;
    /** 運用番号（tripOperationLists 由来。無ければ undefined） */
    operationNumber?: string;
    /** 運用 ID（運用番号から運用行路図へのリンクに使う。無ければ undefined） */
    operationId?: string;
    destinationName: string;
    /** 上り(inbound)=線の左側、下り(outbound)=線の右側（5.8） */
    direction: 'inbound' | 'outbound';
    /** 目撃クロスセクション由来。今日有効ダイヤのみ・取得不能なら undefined（非表示） */
    formationNumber?: string;
    /** 充当編成が属する事業者名（agency 名）。解決できなければ undefined（非表示） */
    formationAgencyName?: string;
    detailLink: [string, string, Record<string, string>];
    /**
     * 駅にいる理由（buildTrainLocationRows が位置の stoppedReason から付ける）。
     * ホームにいると言い切れないので「停車中」と言わず「折返し」「入庫中」「出庫中」と出す
     */
    stoppedReason?: StoppedReason;
}

export type PickerDirection = 'both' | 'inbound' | 'outbound';

export interface PickableTrain {
    tripId: string;
    /** tripDirection 0 = inbound, 1 = outbound（ETripDirection） */
    direction: 'inbound' | 'outbound';
    /** その駅の時刻。発があれば発、無ければ着（当駅止まり） */
    time: Date;
    /** 表示用。`toDisplayTime(days - 1, time)`（days は 1 始まり）で '07:12'・'24:30' */
    displayTime: string;
    /** 当駅止まり（発が無く着だけ） */
    isArrivalOnly: boolean;
    /** at より前 */
    isPast: boolean;
    tripNumber: string;
    /** baseTripClassName 済み */
    tripClassName: string;
    /** 無ければ '#8a8a8a' */
    tripClassColor: string;
    /** 最後の時刻のある停車点の駅名 */
    destinationName: string;
    operationNumber: string;
    operationId: string;
}

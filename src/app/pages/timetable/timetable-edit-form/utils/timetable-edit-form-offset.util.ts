import dayjs from 'dayjs';

const TIME_FORMAT = 'HH:mm';

/**
 * B8 D-5: trip-block コピー後の一括オフセット（±分）。
 * "HH:mm" 表記の時刻へ分単位のオフセットを適用する純関数。
 * 24時をまたぐ場合は dayjs の日付ロールオーバーを利用し HH:mm へ丸め直す
 * （yyyy-MM-dd 部分は捨てるため日跨ぎそのものは呼び出し側の
 * arrivalDays/departureDays 判定に委ねる）。
 */
export function offsetTimeString(
    time: string | null | undefined,
    minutes: number,
): string | null {
    if (!time) return time ?? null;
    if (!minutes) return time;

    return dayjs(time, TIME_FORMAT).add(minutes, 'minute').format(TIME_FORMAT);
}

export type OffsetTimeShape = {
    arrivalTime: string | null;
    departureTime: string | null;
};

/**
 * times 配列（プレーンオブジェクト）へ一括でオフセットを適用する。
 * FormArray への適用はコンポーネント側（times.at(i).patchValue(...)）で行うため、
 * ここでは純粋なデータ変換のみを担い、単体テストしやすくする。
 */
export function applyMinutesOffsetToTimes<T extends OffsetTimeShape>(
    times: readonly T[],
    minutes: number,
): T[] {
    if (!minutes) return [...times];

    return times.map((time) => ({
        ...time,
        arrivalTime: offsetTimeString(time.arrivalTime, minutes),
        departureTime: offsetTimeString(time.departureTime, minutes),
    }));
}

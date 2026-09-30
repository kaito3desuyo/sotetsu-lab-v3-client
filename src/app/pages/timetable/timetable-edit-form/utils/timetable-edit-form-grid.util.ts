import {
    ITimetableEditFormTimeOrderError,
    ITimetableEditFormTimeValue,
    TimetableEditFormTimeField,
} from '../interfaces/timetable-edit-form.interface';
import { ETimetableEditFormStopType } from '../special/enums/timetable-edit-form.enum';

export const timetableEditFormStopTypeMark = new Map<
    ETimetableEditFormStopType,
    string
>([
    [ETimetableEditFormStopType.STOP, '停'],
    [ETimetableEditFormStopType.PASS, 'レ'],
    [ETimetableEditFormStopType.NOT_GOING_THROUGH, '‖'],
]);

export const timetableEditFormTimeFieldLabel = new Map<
    TimetableEditFormTimeField,
    string
>([
    ['arrivalTime', '着'],
    ['departureTime', '発'],
]);

/** 停 → レ → ‖ → 停 */
export function nextStopType(
    current: ETimetableEditFormStopType,
): ETimetableEditFormStopType {
    switch (current) {
        case ETimetableEditFormStopType.STOP:
            return ETimetableEditFormStopType.PASS;
        case ETimetableEditFormStopType.PASS:
            return ETimetableEditFormStopType.NOT_GOING_THROUGH;
        default:
            return ETimetableEditFormStopType.STOP;
    }
}

/** 04:00 起点の分（04:00 より前は翌日として数える） */
export function toServiceMinutes(time: string): number {
    const [hour, minute] = time.split(':').map(Number);
    return (hour < 4 ? hour + 24 : hour) * 60 + minute;
}

/** ‖ 以外の最初と最後の駅の位置（始発・終着） */
export function findEndpointIndexes(
    times: readonly ITimetableEditFormTimeValue[],
): { first: number | null; last: number | null } {
    let first: number | null = null;
    let last: number | null = null;

    times.forEach((time, index) => {
        if (time.stopType === ETimetableEditFormStopType.NOT_GOING_THROUGH) {
            return;
        }
        if (first === null) first = index;
        last = index;
    });

    return { first, last };
}

/**
 * 前の駅より早い時刻を列挙する。格子の赤・誤りの一言・保存の可否（検証器）が共有する。
 * 前の「時刻のある駅」の発（なければ着）と、この駅の着（なければ発）を 04:00 起点で比べる。
 * 時刻の無い通過駅はまたいで比べる。停車駅が 2 つ以上なら、保存時に捨てる
 * 始発の着・終着の発は無いものとして扱う。
 */
export function findTimeOrderErrors(
    times: readonly ITimetableEditFormTimeValue[],
): ITimetableEditFormTimeOrderError[] {
    const { first, last } = findEndpointIndexes(times);
    const ignoresEndpoints = first !== last;
    const errors: ITimetableEditFormTimeOrderError[] = [];
    let prev: { index: number; time: string } | null = null;

    times.forEach((time, index) => {
        if (time.stopType === ETimetableEditFormStopType.NOT_GOING_THROUGH) {
            return;
        }

        const arrivalTime =
            ignoresEndpoints && index === first
                ? null
                : time.arrivalTime || null;
        const departureTime =
            ignoresEndpoints && index === last
                ? null
                : time.departureTime || null;

        const field: TimetableEditFormTimeField | null = arrivalTime
            ? 'arrivalTime'
            : departureTime
              ? 'departureTime'
              : null;
        const current = arrivalTime ?? departureTime;

        if (
            field &&
            prev &&
            toServiceMinutes(prev.time) > toServiceMinutes(current)
        ) {
            errors.push({
                index,
                field,
                time: current,
                prevIndex: prev.index,
                prevTime: prev.time,
            });
        }

        const outgoing = departureTime ?? arrivalTime;
        if (outgoing) prev = { index, time: outgoing };
    });

    return errors;
}

import { ITimetableEditFormTimeValue } from '../interfaces/timetable-edit-form.interface';
import { ETimetableEditFormStopType } from '../special/enums/timetable-edit-form.enum';
import {
    findEndpointIndexes,
    findTimeOrderErrors,
    nextStopType,
    timetableEditFormStopTypeMark,
    toServiceMinutes,
} from './timetable-edit-form-grid.util';

const S = ETimetableEditFormStopType;
const t = (
    stopType: ETimetableEditFormStopType,
    arrivalTime: string | null = null,
    departureTime: string | null = null,
): ITimetableEditFormTimeValue => ({ stopType, arrivalTime, departureTime });

describe('nextStopType / timetableEditFormStopTypeMark', () => {
    it('停 → レ → ‖ → 停 と循環する', () => {
        expect(nextStopType(S.STOP)).toBe(S.PASS);
        expect(nextStopType(S.PASS)).toBe(S.NOT_GOING_THROUGH);
        expect(nextStopType(S.NOT_GOING_THROUGH)).toBe(S.STOP);
    });

    it('記号は 停・レ・‖', () => {
        expect(timetableEditFormStopTypeMark.get(S.STOP)).toBe('停');
        expect(timetableEditFormStopTypeMark.get(S.PASS)).toBe('レ');
        expect(timetableEditFormStopTypeMark.get(S.NOT_GOING_THROUGH)).toBe(
            '‖',
        );
    });
});

describe('toServiceMinutes', () => {
    it('04:00 より前は翌日として数える', () => {
        expect(toServiceMinutes('04:00')).toBe(240);
        expect(toServiceMinutes('23:59')).toBe(1439);
        expect(toServiceMinutes('00:30')).toBe(1470);
    });
});

describe('findEndpointIndexes', () => {
    it('‖ 以外の最初と最後の位置を返す', () => {
        expect(
            findEndpointIndexes([
                t(S.NOT_GOING_THROUGH),
                t(S.STOP),
                t(S.PASS),
                t(S.STOP),
                t(S.NOT_GOING_THROUGH),
            ]),
        ).toEqual({ first: 1, last: 3 });
    });

    it('全部 ‖ なら null', () => {
        expect(findEndpointIndexes([t(S.NOT_GOING_THROUGH)])).toEqual({
            first: null,
            last: null,
        });
    });
});

describe('findTimeOrderErrors', () => {
    it('順に並んでいれば誤りなし', () => {
        expect(
            findTimeOrderErrors([
                t(S.STOP, null, '11:54'),
                t(S.PASS),
                t(S.STOP, '12:01', '12:02'),
                t(S.STOP, '12:10', null),
            ]),
        ).toEqual([]);
    });

    it('前の駅の発より早い着を誤りにする', () => {
        expect(
            findTimeOrderErrors([
                t(S.STOP, null, '12:15'),
                t(S.STOP, '12:10', '12:11'),
                t(S.STOP, '12:20', null),
            ]),
        ).toEqual([
            {
                index: 1,
                field: 'arrivalTime',
                time: '12:10',
                prevIndex: 0,
                prevTime: '12:15',
            },
        ]);
    });

    it('時刻の無い通過駅をまたいで比べる', () => {
        expect(
            findTimeOrderErrors([
                t(S.STOP, null, '10:10'),
                t(S.PASS),
                t(S.STOP, '10:05', null),
            ]),
        ).toEqual([
            {
                index: 2,
                field: 'arrivalTime',
                time: '10:05',
                prevIndex: 0,
                prevTime: '10:10',
            },
        ]);
    });

    it('着が無ければ発で比べ、‖ の駅は飛ばす', () => {
        expect(
            findTimeOrderErrors([
                t(S.STOP, null, '10:10'),
                t(S.NOT_GOING_THROUGH, '09:00', '09:00'),
                t(S.PASS, null, '10:08'),
                t(S.STOP, '10:20', null),
            ]),
        ).toEqual([
            {
                index: 2,
                field: 'departureTime',
                time: '10:08',
                prevIndex: 0,
                prevTime: '10:10',
            },
        ]);
    });

    it('0 時台は 23 時台より後として扱う', () => {
        expect(
            findTimeOrderErrors([
                t(S.STOP, null, '23:58'),
                t(S.STOP, '00:03', null),
            ]),
        ).toEqual([]);
    });

    it('停車駅が 2 つ以上なら始発の着・終着の発は無いものとして扱う', () => {
        expect(
            findTimeOrderErrors([
                t(S.STOP, '13:00', '10:00'),
                t(S.STOP, '10:10', '09:00'),
            ]),
        ).toEqual([]);
    });
});

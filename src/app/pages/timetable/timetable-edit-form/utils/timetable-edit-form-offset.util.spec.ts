import {
    applyMinutesOffsetToTimes,
    offsetTimeString,
} from './timetable-edit-form-offset.util';

describe('offsetTimeString', () => {
    it('null/undefined はそのまま返す', () => {
        expect(offsetTimeString(null, 10)).toBeNull();
        expect(offsetTimeString(undefined, 10)).toBeNull();
    });

    it('オフセット0は元の値をそのまま返す', () => {
        expect(offsetTimeString('10:00', 0)).toBe('10:00');
    });

    it('正のオフセットで時刻を加算する', () => {
        expect(offsetTimeString('10:00', 15)).toBe('10:15');
    });

    it('負のオフセットで時刻を減算する', () => {
        expect(offsetTimeString('10:00', -15)).toBe('09:45');
    });

    it('24時をまたぐ場合は HH:mm でロールオーバーする', () => {
        expect(offsetTimeString('23:50', 20)).toBe('00:10');
    });

    it('0時をまたいで前日側に戻る場合もロールオーバーする', () => {
        expect(offsetTimeString('00:05', -10)).toBe('23:55');
    });
});

describe('applyMinutesOffsetToTimes', () => {
    it('全件へ一括でオフセットを適用する（ブロック内全列車に効く想定の単位テスト）', () => {
        const times = [
            { arrivalTime: null, departureTime: '10:00' },
            { arrivalTime: '10:10', departureTime: '10:11' },
            { arrivalTime: '10:20', departureTime: null },
        ];

        expect(applyMinutesOffsetToTimes(times, 5)).toEqual([
            { arrivalTime: null, departureTime: '10:05' },
            { arrivalTime: '10:15', departureTime: '10:16' },
            { arrivalTime: '10:25', departureTime: null },
        ]);
    });

    it('オフセット0は配列のコピーを返す（副作用なし）', () => {
        const times = [{ arrivalTime: '10:00', departureTime: '10:01' }];
        const result = applyMinutesOffsetToTimes(times, 0);

        expect(result).toEqual(times);
        expect(result).not.toBe(times);
    });
});

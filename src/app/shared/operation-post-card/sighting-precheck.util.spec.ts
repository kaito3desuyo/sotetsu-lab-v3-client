import {
    findSightingBlockers,
    isFormationNotInToday,
    toSightingTimeIso,
} from './sighting-precheck.util';

describe('toSightingTimeIso', () => {
    const specified = (sightingTime: string, now: string) =>
        toSightingTimeIso({
            timeSetting: 'specifiedTime',
            sightingTime,
            now: new Date(now),
        });

    it('currentTime は now の ISO', () => {
        const now = new Date('2026-11-10T01:00:00Z');
        expect(
            toSightingTimeIso({
                timeSetting: 'currentTime',
                sightingTime: '09:00',
                now,
            }),
        ).toBe(now.toISOString());
    });

    it('specifiedTime 日本時間 10:30 に 10:00 を打つと当日 10:00（日本時間）', () => {
        expect(specified('10:00', '2026-11-13T01:30:00Z')).toBe(
            '2026-11-13T01:00:00.000Z',
        );
    });

    it('specifiedTime 10:00 に 09:30 を打つと当日 09:30', () => {
        expect(specified('09:30', '2026-11-10T01:00:00Z')).toBe(
            '2026-11-10T00:30:00.000Z',
        );
    });

    it('specifiedTime 10:00 に 03:50 を打つと翌日 03:50（営業日の終わり）', () => {
        expect(specified('03:50', '2026-11-10T01:00:00Z')).toBe(
            '2026-11-10T18:50:00.000Z',
        );
    });

    it('specifiedTime 02:00 に 23:30 を打つと前日 23:30', () => {
        expect(specified('23:30', '2026-11-12T17:00:00Z')).toBe(
            '2026-11-12T14:30:00.000Z',
        );
    });

    it('specifiedTime 02:00 に 01:00 を打つと同じ日の 01:00', () => {
        expect(specified('01:00', '2026-11-12T17:00:00Z')).toBe(
            '2026-11-12T16:00:00.000Z',
        );
    });
});

describe('toSightingTimeIso の 4 時の境目', () => {
    const iso = (now: string) =>
        toSightingTimeIso({
            timeSetting: 'specifiedTime',
            sightingTime: '04:00',
            now: new Date(now),
        });

    it('now が 03:59 のとき 04:00 は前の営業日の 04:00（前日）', () => {
        expect(iso('2026-11-09T18:59:00Z')).toBe('2026-11-08T19:00:00.000Z');
    });

    it('now が 04:00 のとき 04:00 は当日の 04:00', () => {
        expect(iso('2026-11-09T19:00:00Z')).toBe('2026-11-09T19:00:00.000Z');
    });
});

describe('findSightingBlockers', () => {
    const now = new Date(2026, 10, 10, 10, 0);

    it('sightingTimeIso が now より後なら future_time', () => {
        expect(
            findSightingBlockers({
                operationNumber: '10',
                sightingTimeIso: new Date(2026, 10, 10, 10, 1).toISOString(),
                now,
                todaysOperationNumbers: [],
            }),
        ).toEqual(['future_time']);
    });

    it('now と同じ時刻なら止めない', () => {
        expect(
            findSightingBlockers({
                operationNumber: '10',
                sightingTimeIso: now.toISOString(),
                now,
                todaysOperationNumbers: [],
            }),
        ).toEqual([]);
    });

    it('今日の運用に無い番号なら operation_not_found', () => {
        expect(
            findSightingBlockers({
                operationNumber: '99',
                sightingTimeIso: now.toISOString(),
                now,
                todaysOperationNumbers: ['10', '11'],
            }),
        ).toEqual(['operation_not_found']);
    });

    it('両方当てはまるなら future_time, operation_not_found の順', () => {
        expect(
            findSightingBlockers({
                operationNumber: '99',
                sightingTimeIso: new Date(2026, 10, 10, 11, 0).toISOString(),
                now,
                todaysOperationNumbers: ['10'],
            }),
        ).toEqual(['future_time', 'operation_not_found']);
    });

    it('今日の一覧にある番号は止めない', () => {
        expect(
            findSightingBlockers({
                operationNumber: '11',
                sightingTimeIso: now.toISOString(),
                now,
                todaysOperationNumbers: ['10', '11'],
            }),
        ).toEqual([]);
    });

    it('100 は今日の一覧に無くても止めない', () => {
        expect(
            findSightingBlockers({
                operationNumber: '100',
                sightingTimeIso: now.toISOString(),
                now,
                todaysOperationNumbers: ['10', '11'],
            }),
        ).toEqual([]);
    });

    it('todaysOperationNumbers が空なら運用番号は確かめない', () => {
        expect(
            findSightingBlockers({
                operationNumber: '99',
                sightingTimeIso: now.toISOString(),
                now,
                todaysOperationNumbers: [],
            }),
        ).toEqual([]);
    });
});

describe('isFormationNotInToday', () => {
    const todaysFormations = [
        { agencyId: 'a1', formationNumber: '9701' },
        { agencyId: 'a2', formationNumber: '1001' },
    ];

    it('所属を選んでいて、その会社の今日の編成に無ければ true', () => {
        expect(
            isFormationNotInToday({
                agencyId: 'a1',
                formationOrVehicleNumber: '1001',
                todaysFormations,
            }),
        ).toBe(true);
    });

    it('所属が空なら全社の今日の編成で探す', () => {
        expect(
            isFormationNotInToday({
                agencyId: '',
                formationOrVehicleNumber: '1001',
                todaysFormations,
            }),
        ).toBe(false);
    });

    it('車両番号らしい 10101 でも編成番号に無ければ true（止めずに注意だけなので true でよい）', () => {
        expect(
            isFormationNotInToday({
                agencyId: '',
                formationOrVehicleNumber: '10101',
                todaysFormations,
            }),
        ).toBe(true);
    });

    it('todaysFormations が空なら false', () => {
        expect(
            isFormationNotInToday({
                agencyId: 'a1',
                formationOrVehicleNumber: '9701',
                todaysFormations: [],
            }),
        ).toBe(false);
    });

    it('前後の空白は無視して比べる（今日の編成にある番号なら false）', () => {
        expect(
            isFormationNotInToday({
                agencyId: 'a1',
                formationOrVehicleNumber: ' 9701 ',
                todaysFormations,
            }),
        ).toBe(false);
    });

    it('入力が空なら false', () => {
        expect(
            isFormationNotInToday({
                agencyId: 'a1',
                formationOrVehicleNumber: '  ',
                todaysFormations,
            }),
        ).toBe(false);
    });
});

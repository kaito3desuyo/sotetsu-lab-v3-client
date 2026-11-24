import {
    FormationDetailsDto,
    VehicleFormationDto,
} from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import {
    ModificationRecord,
    buildFormationPeriods,
    buildModificationHistory,
    changedCars,
    collectVehicleModifications,
    liveryAt,
    periodAt,
} from './formation-periods.util';

const livery = (
    value: string | null,
    modifiedOn: string | null,
): ModificationRecord => ({
    modifiedOn,
    kind: 'livery',
    value,
    description: null,
});

const cars = (
    numbers: string[],
    modifications: ModificationRecord[] = [],
): VehicleFormationDto[] =>
    numbers.map((vehicleNumber, i) => ({
        carNumber: i + 1,
        vehicle: { vehicleNumber, modifications },
    }));

const row = (
    formationNumber: string,
    startDate: string | null,
    endDate: string | null,
    vehicleFormations: VehicleFormationDto[],
): FormationDetailsDto =>
    ({
        formationNumber,
        vehicleType: '7000',
        startDate,
        endDate,
        agency: { agencyName: '相鉄' },
        vehicleFormations,
    }) as FormationDetailsDto;

const OLD = ['7710', '7125', '7126', '7505', '7602', '7107', '7108', '7509'];
const WIDE = [
    '7710',
    '7125',
    '7126',
    '7607',
    '7127',
    '7128',
    '7602',
    '7107',
    '7108',
    '7509',
];
const NEW = ['7710', '7125', '7126', '7505', '7602', '7107', '7108', '7509'];
// 最も古い期間は 7505 の代わりに 7501 を入れて、新旧を見分ける
const FIRST = ['7710', '7125', '7126', '7501', '7602', '7107', '7108', '7509'];

const rows7710 = (): FormationDetailsDto[] => [
    row('7710', '2019-05-13', '2019-10-14', cars(NEW)),
    row('7710', null, '2019-04-28', cars(FIRST)),
    row('3121', '2099-01-01', null, []),
    row('7710', '2019-04-29', '2019-05-12', cars(WIDE)),
    row('7711', '2019-01-01', null, cars(OLD)),
];

describe('formation-periods.util', () => {
    describe('liveryAt', () => {
        it('日付の無い記録だけなら、その値', () => {
            expect(liveryAt([livery('7000', null)], '2019-01-01')).toBe('7000');
        });

        it('後の日付の記録は、その日以後だけ使う', () => {
            const m = [
                livery('8000-red', null),
                livery('8000-ynb', '2020-03-01'),
            ];
            expect(liveryAt(m, '2020-02-29')).toBe('8000-red');
            expect(liveryAt(m, '2020-03-01')).toBe('8000-ynb');
        });

        it('並びが逆でも最新を選ぶ', () => {
            const m = [
                livery('8000-ynb', '2020-03-01'),
                livery('8000-red', null),
            ];
            expect(liveryAt(m, '2021-01-01')).toBe('8000-ynb');
        });

        it('livery 以外の種類は見ない', () => {
            const m: ModificationRecord[] = [
                {
                    modifiedOn: null,
                    kind: 'renewal',
                    value: '7000',
                    description: null,
                },
            ];
            expect(liveryAt(m, '2021-01-01')).toBeNull();
        });

        it('記録が無い・まだ始まっていない・表に無い値は null', () => {
            expect(liveryAt(undefined, '2021-01-01')).toBeNull();
            expect(
                liveryAt([livery('7000', '2022-01-01')], '2021-01-01'),
            ).toBeNull();
            expect(
                liveryAt([livery('unknown', null)], '2021-01-01'),
            ).toBeNull();
            expect(liveryAt([livery(null, null)], '2021-01-01')).toBeNull();
        });
    });

    describe('buildFormationPeriods', () => {
        it('その番号の行だけを新しい期間から並べ、0 両の行は除く', () => {
            const periods = buildFormationPeriods(
                rows7710(),
                '7710',
                '2026-11-20',
            );

            expect(
                periods.map((p) => [p.startDate, p.endDate, p.cars.length]),
            ).toEqual([
                ['2019-05-13', '2019-10-14', 8],
                ['2019-04-29', '2019-05-12', 10],
                [null, '2019-04-28', 8],
            ]);
            expect(periods[0].agencyName).toBe('相鉄');
        });

        it('0 両の番号は空になる', () => {
            expect(
                buildFormationPeriods(rows7710(), '3121', '2026-11-20'),
            ).toEqual([]);
        });

        it('carNumber が逆順で来ても号車の順になる', () => {
            const reversed = cars(['A', 'B', 'C']).reverse();
            const [period] = buildFormationPeriods(
                [row('1', null, null, reversed)],
                '1',
                '2026-11-20',
            );
            expect(period.cars.map((c) => c.vehicleNumber)).toEqual([
                'A',
                'B',
                'C',
            ]);
        });

        it('塗装は期間の最後の日の時点、続く期間は今日の時点', () => {
            const m = [
                livery('8000-red', null),
                livery('8000-ynb', '2020-03-01'),
            ];
            const periods = buildFormationPeriods(
                [
                    row('1', null, '2020-02-29', cars(['A'], m)),
                    row('1', '2020-03-01', null, cars(['A'], m)),
                ],
                '1',
                '2026-11-20',
            );
            expect(periods[0].cars[0].livery).toBe('8000-ynb');
            expect(periods[1].cars[0].livery).toBe('8000-red');
        });

        it('期間の途中で塗り替えても、期間の絵は最後の日の塗装', () => {
            const m = [
                livery('8000-red', null),
                livery('8000-group', '2020-01-10'),
            ];
            const [period] = buildFormationPeriods(
                [row('1', '2019-01-01', '2020-06-30', cars(['A'], m))],
                '1',
                '2026-11-20',
            );
            expect(period.cars[0].livery).toBe('8000-group');
        });

        it('記録の無い車両の塗装は null', () => {
            const [period] = buildFormationPeriods(
                [row('1', null, null, cars(['A']))],
                '1',
                '2026-11-20',
            );
            expect(period.cars[0].livery).toBeNull();
        });

        it('始まりが空の期間と終わりが空の期間を並べても落ちない', () => {
            const periods = buildFormationPeriods(
                [
                    row('1', null, '2000-01-01', cars(['A'])),
                    row('1', '2000-01-02', null, cars(['B'])),
                ],
                '1',
                '2026-11-20',
            );
            expect(periods.map((p) => p.cars[0].vehicleNumber)).toEqual([
                'B',
                'A',
            ]);
        });
    });

    describe('changedCars', () => {
        const periods = buildFormationPeriods(rows7710(), '7710', '2026-11-20');

        it('10 両の期間は 7607・7127・7128', () => {
            expect([...changedCars(periods, 1)].sort()).toEqual([
                '7127',
                '7128',
                '7607',
            ]);
        });

        it('最新の期間は 7505', () => {
            expect([...changedCars(periods, 0)]).toEqual(['7505']);
        });

        it('最も古い期間は空', () => {
            expect(changedCars(periods, 2).size).toBe(0);
        });
    });

    describe('periodAt', () => {
        const periods = buildFormationPeriods(rows7710(), '7710', '2026-11-20');

        it('終わった後は最後の期間', () => {
            expect(periodAt(periods, '2019-10-31')).toBe(periods[0]);
        });

        it('期間の中の日はその期間', () => {
            expect(periodAt(periods, '2019-05-01')).toBe(periods[1]);
            expect(periodAt(periods, '2019-04-29')).toBe(periods[1]);
            expect(periodAt(periods, '2019-05-12')).toBe(periods[1]);
        });

        it('始まりが空の期間は、その終わりの日まで含む', () => {
            expect(periodAt(periods, '2010-01-01')).toBe(periods[2]);
        });

        it('期間のあいだの日は、前の期間', () => {
            const gap = buildFormationPeriods(
                [
                    row('1', '2020-01-01', '2020-01-31', cars(['A'])),
                    row('1', '2020-03-01', '2020-03-31', cars(['B'])),
                ],
                '1',
                '2026-11-20',
            );
            expect(periodAt(gap, '2020-02-15')).toBe(gap[1]);
        });

        it('どの期間よりも前の日や期間が無いときは null', () => {
            const only = buildFormationPeriods(
                [row('1', '2020-01-01', null, cars(['A']))],
                '1',
                '2026-11-20',
            );
            expect(periodAt(only, '2019-12-31')).toBeNull();
            expect(periodAt([], '2019-12-31')).toBeNull();
        });
    });

    describe('buildModificationHistory', () => {
        const period = (n: string[]) =>
            buildFormationPeriods(
                [row('1', null, null, cars(n))],
                '1',
                '2026-11-20',
            )[0];

        it('全車両が同じ日にリニューアルなら 1 行で all', () => {
            const renewal: ModificationRecord = {
                modifiedOn: '2021-04-01',
                kind: 'renewal',
                value: null,
                description: '内装更新',
            };
            const history = buildModificationHistory(period(['A', 'B']), {
                A: [renewal],
                B: [renewal],
            });
            expect(history).toEqual([{ ...renewal, vehicles: 'all' }]);
        });

        it('1 両だけの塗り替えはその車両番号を持ち、新しい順で日付なしは最後', () => {
            const history = buildModificationHistory(period(['A', 'B']), {
                A: [livery('8000-red', null), livery('8000-ynb', '2022-05-01')],
                B: [livery('8000-red', null)],
            });
            expect(history).toEqual([
                {
                    modifiedOn: '2022-05-01',
                    kind: 'livery',
                    value: '8000-ynb',
                    description: null,
                    vehicles: ['A'],
                },
                {
                    modifiedOn: null,
                    kind: 'livery',
                    value: '8000-red',
                    description: null,
                    vehicles: 'all',
                },
            ]);
        });

        it('日付が同じでも説明が違えば別の行、組成に無い車両の記録は出さない', () => {
            const a: ModificationRecord = {
                modifiedOn: '2021-04-01',
                kind: 'equipment',
                value: null,
                description: 'VVVF',
            };
            const history = buildModificationHistory(period(['A', 'B']), {
                A: [a, { ...a, description: 'SIV' }],
                B: [a],
                Z: [livery('7000', null)],
            });
            expect(history.map((h) => [h.description, h.vehicles])).toEqual([
                ['VVVF', 'all'],
                ['SIV', ['A']],
            ]);
        });

        it('記録が無ければ空', () => {
            expect(buildModificationHistory(period(['A']), {})).toEqual([]);
        });
    });

    describe('collectVehicleModifications', () => {
        it('その番号の車両ごとに記録を集める', () => {
            const m = [livery('7000', null)];
            const result = collectVehicleModifications(
                [
                    row('1', null, null, cars(['A'], m)),
                    row('2', null, null, cars(['B'], m)),
                ],
                '1',
            );
            expect(result).toEqual({ A: m });
        });
    });
});

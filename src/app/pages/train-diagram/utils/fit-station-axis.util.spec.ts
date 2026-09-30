import { StationAxis } from 'src/app/shared/diagram-scale';
import {
    fitStationAxisToTrips,
    hasObservationByGap,
    StationAxisObservation,
} from './fit-station-axis.util';

/** 列車ごとの最小二乗の速さ v = Σ(ΔP・t)/Σt² から Σ(ΔP − v t)² を計算する（テスト用の検証関数）。 */
function chainResidualSquaredSum(
    axisY: readonly number[],
    observationsByTrip: ReadonlyMap<
        string,
        readonly { fromIndex: number; toIndex: number; minutes: number }[]
    >,
): number {
    let total = 0;
    for (const segments of observationsByTrip.values()) {
        let sumDPt = 0;
        let sumT2 = 0;
        for (const s of segments) {
            const deltaP = axisY[s.toIndex] - axisY[s.fromIndex];
            sumDPt += deltaP * s.minutes;
            sumT2 += s.minutes * s.minutes;
        }
        const v = sumT2 > 0 ? sumDPt / sumT2 : 0;
        for (const s of segments) {
            const deltaP = axisY[s.toIndex] - axisY[s.fromIndex];
            total += (deltaP - v * s.minutes) ** 2;
        }
    }
    return total;
}

function groupByTrip(
    observations: readonly StationAxisObservation[],
): Map<string, StationAxisObservation[]> {
    const map = new Map<string, StationAxisObservation[]>();
    for (const obs of observations) {
        const list = map.get(obs.tripId) ?? [];
        list.push(obs);
        map.set(obs.tripId, list);
    }
    return map;
}

describe('fitStationAxisToTrips', () => {
    it('区間比が全列車で同じ（各停 A→B2分・B→C4分、急行 A→C6分）なら、合わせた駅間の比は1:2のまま', () => {
        const axis: StationAxis = [
            { stationId: 'A', y: 0 },
            { stationId: 'B', y: 2 },
            { stationId: 'C', y: 6 },
        ];
        const observations: StationAxisObservation[] = [];
        for (let i = 0; i < 20; i++) {
            observations.push({
                tripId: `local-${i}`,
                fromIndex: 0,
                toIndex: 1,
                minutes: 2,
            });
            observations.push({
                tripId: `local-${i}`,
                fromIndex: 1,
                toIndex: 2,
                minutes: 4,
            });
        }
        observations.push({
            tripId: 'express-1',
            fromIndex: 0,
            toIndex: 2,
            minutes: 6,
        });

        const result = fitStationAxisToTrips({ axis, observations });

        const gapAB = result[1].y - result[0].y;
        const gapBC = result[2].y - result[1].y;
        expect(gapAB).toBeGreaterThan(0);
        expect(gapBC / gapAB).toBeCloseTo(2, 1);
        // 全体の長さは維持される
        expect(result[2].y - result[0].y).toBeCloseTo(axis[2].y - axis[0].y, 5);
    });

    it('急行が各停と逆の配分（B停車、A→B1分・B→C3分）だと、合わせた後の折れ具合の合計が初期より小さくなる', () => {
        const axis: StationAxis = [
            { stationId: 'A', y: 0 },
            { stationId: 'B', y: 3 },
            { stationId: 'C', y: 6 },
        ];
        const observations: StationAxisObservation[] = [
            { tripId: 'local-1', fromIndex: 0, toIndex: 1, minutes: 3 },
            { tripId: 'local-1', fromIndex: 1, toIndex: 2, minutes: 3 },
            { tripId: 'express-1', fromIndex: 0, toIndex: 1, minutes: 1 },
            { tripId: 'express-1', fromIndex: 1, toIndex: 2, minutes: 3 },
        ];
        const byTrip = groupByTrip(observations);

        const initialResidual = chainResidualSquaredSum(
            axis.map((e) => e.y),
            byTrip,
        );

        const result = fitStationAxisToTrips({ axis, observations });
        const fittedResidual = chainResidualSquaredSum(
            result.map((e) => e.y),
            byTrip,
        );

        expect(fittedResidual).toBeLessThan(initialResidual);
    });

    it('観測の無い駅間は初期値に近いまま（相対差10%以内）', () => {
        const axis: StationAxis = [
            { stationId: 'A', y: 0 },
            { stationId: 'B', y: 3 },
            { stationId: 'C', y: 6 },
            { stationId: 'D', y: 21 }, // C→D は観測なし
        ];
        const observations: StationAxisObservation[] = [
            { tripId: 'local-1', fromIndex: 0, toIndex: 1, minutes: 3 },
            { tripId: 'local-1', fromIndex: 1, toIndex: 2, minutes: 3 },
            { tripId: 'express-1', fromIndex: 0, toIndex: 1, minutes: 1 },
            { tripId: 'express-1', fromIndex: 1, toIndex: 2, minutes: 3 },
        ];

        const result = fitStationAxisToTrips({ axis, observations });

        const initialGapCD = axis[3].y - axis[2].y;
        const fittedGapCD = result[3].y - result[2].y;
        expect(
            Math.abs(fittedGapCD - initialGapCD) / initialGapCD,
        ).toBeLessThan(0.1);
    });

    it('どの駅間も0.3×平均の駅間以上。全体の長さは初期と同じ', () => {
        const axis: StationAxis = [
            { stationId: 'A', y: 0 },
            { stationId: 'B', y: 10 },
            { stationId: 'C', y: 20 },
        ];
        // 極端に速い（=区間をほぼ0に潰そうとする）観測をぶつける
        const observations: StationAxisObservation[] = [];
        for (let i = 0; i < 30; i++) {
            observations.push({
                tripId: `fast-${i}`,
                fromIndex: 0,
                toIndex: 1,
                minutes: 0.01,
            });
            observations.push({
                tripId: `fast-${i}`,
                fromIndex: 1,
                toIndex: 2,
                minutes: 20,
            });
        }

        const result = fitStationAxisToTrips({ axis, observations });

        const gaps = [result[1].y - result[0].y, result[2].y - result[1].y];
        const meanInitialGap = 10;
        for (const gap of gaps) {
            expect(gap).toBeGreaterThanOrEqual(0.3 * meanInitialGap - 1e-6);
        }
        expect(result[2].y - result[0].y).toBeCloseTo(axis[2].y - axis[0].y, 5);
    });

    it('観測が0件なら軸をそのまま返す', () => {
        const axis: StationAxis = [
            { stationId: 'A', y: 0 },
            { stationId: 'B', y: 5 },
        ];
        const result = fitStationAxisToTrips({ axis, observations: [] });
        expect(result).toBe(axis);
    });

    it('軸が1駅以下なら観測があってもそのまま返す', () => {
        const axis: StationAxis = [{ stationId: 'A', y: 0 }];
        const result = fitStationAxisToTrips({
            axis,
            observations: [
                { tripId: 't1', fromIndex: 0, toIndex: 0, minutes: 1 },
            ],
        });
        expect(result).toBe(axis);
    });
});

describe('hasObservationByGap', () => {
    it('観測が直接覆う駅間だけ true（多区間にまたがる観測は全ての区間を true にする）', () => {
        // A(0) B(1) C(2) D(3)。A→C の1本の観測（1区間の観測は無い駅間もある想定）
        const observations: StationAxisObservation[] = [
            { tripId: 't1', fromIndex: 0, toIndex: 2, minutes: 6 },
        ];
        expect(hasObservationByGap(observations, 4)).toEqual([
            true, // A-B
            true, // B-C
            false, // C-D（観測なし）
        ]);
    });

    it('逆向き（toIndex < fromIndex）の観測も同じ区間を覆う', () => {
        const observations: StationAxisObservation[] = [
            { tripId: 't1', fromIndex: 2, toIndex: 1, minutes: 3 },
        ];
        expect(hasObservationByGap(observations, 3)).toEqual([false, true]);
    });

    it('範囲外・ゼロ区間・所要0以下の観測は無視する', () => {
        const observations: StationAxisObservation[] = [
            { tripId: 't1', fromIndex: -1, toIndex: 1, minutes: 3 },
            { tripId: 't1', fromIndex: 0, toIndex: 0, minutes: 3 },
            { tripId: 't1', fromIndex: 0, toIndex: 1, minutes: 0 },
        ];
        expect(hasObservationByGap(observations, 3)).toEqual([false, false]);
    });

    it('観測 0 件、または軸 1 駅以下なら空配列（負にならない）', () => {
        expect(hasObservationByGap([], 3)).toEqual([false, false]);
        expect(hasObservationByGap([], 1)).toEqual([]);
        expect(hasObservationByGap([], 0)).toEqual([]);
    });
});

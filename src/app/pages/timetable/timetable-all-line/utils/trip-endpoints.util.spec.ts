import { ETimetableAllLineStationViewMode } from '../enums/timetable-all-line.enum';
import { getTime } from './get-time.util';
import {
    hasVisibleStop,
    hiddenStopsAround,
    tripEndpoints,
} from './trip-endpoints.util';

/** 停車順（配列順）に stopSequence を振った列車 */
function trip(id: string, stops: [string, string | null, string | null][]) {
    return {
        tripId: id,
        tripBlockId: id,
        times: stops.map(([stationId, arrivalTime, departureTime], i) => ({
            stationId,
            stopSequence: i + 1,
            arrivalTime,
            departureTime,
            arrivalDays: 0,
            departureDays: 0,
        })),
    } as any;
}

const station = (id: string) => ({ stationId: id, stationName: id }) as any;

describe('hiddenStopsAround', () => {
    it('最初・最後の表示駅の前後に隠れた駅があるかを返す', () => {
        const t = trip('t', [
            ['新宿', null, '10:00:00'],
            ['羽沢', '10:30:00', '10:31:00'],
            ['西谷', '10:33:00', null],
        ]);
        expect(hiddenStopsAround(t, new Set(['羽沢', '西谷']))).toEqual({
            before: true,
            after: false,
        });
        expect(hiddenStopsAround(t, new Set(['新宿', '羽沢']))).toEqual({
            before: false,
            after: true,
        });
    });

    it('表示駅に 1 つも停まらない列車は前後とも false', () => {
        const t = trip('t', [
            ['大崎', null, '10:00:00'],
            ['新木場', '10:20:00', null],
        ]);
        expect(hiddenStopsAround(t, new Set(['西谷']))).toEqual({
            before: false,
            after: false,
        });
    });

    it('停車順は配列の順ではなく stopSequence で見る', () => {
        const t = trip('t', [
            ['新宿', null, '10:00:00'],
            ['西谷', '10:33:00', null],
        ]);
        t.times.reverse(); // API の並びに依らない
        expect(hiddenStopsAround(t, new Set(['西谷'])).before).toBe(true);
    });
});

describe('tripEndpoints', () => {
    const names = new Map([
        ['新宿', '新宿'],
        ['西谷', '西谷'],
        ['海老名', '海老名'],
    ]);

    it('停車順で最初・最後の駅と、その発時刻・着時刻を返す（1 桁の時は「-」付き）', () => {
        const t = trip('t', [
            ['新宿', null, '09:58:00'],
            ['西谷', '10:33:00', '10:34:00'],
            ['海老名', '10:52:00', null],
        ]);
        t.times.reverse(); // API の並びに依らない
        expect(tripEndpoints(t, names)).toEqual({
            originName: '新宿',
            originTime: '-958',
            terminusName: '海老名',
            terminusTime: '1052',
        });
    });

    it('始発駅に発時刻が無ければ着時刻、終着駅に着時刻が無ければ発時刻', () => {
        const t = trip('t', [
            ['新宿', '09:58:00', null],
            ['海老名', null, '10:52:00'],
        ]);
        const result = tripEndpoints(t, names);
        expect(result.originTime).toBe('-958');
        expect(result.terminusTime).toBe('1052');
    });
});

describe('hasVisibleStop', () => {
    it('表示駅に 1 つでも停まるか', () => {
        const t = trip('t', [
            ['大崎', null, '10:00:00'],
            ['新木場', '10:20:00', null],
        ]);
        expect(hasVisibleStop(t, new Set(['西谷']))).toBe(false);
        expect(hasVisibleStop(t, new Set(['新木場']))).toBe(true);
    });
});

describe('getTime（始発・終着が隠れた列車の「経由なし」）', () => {
    // 表示駅は 上端 → 羽沢 → 西谷 → 下端 の 4 駅。列車は隠れた新宿から来て西谷止まり
    const stations = ['上端', '羽沢', '西谷', '下端'].map(station);
    const viewModes = new Map(
        stations.map((s) => [
            s.stationId,
            ETimetableAllLineStationViewMode.ONLY_DEPARTURE,
        ]),
    );
    const cell = (t: any, stationId: string) =>
        getTime({
            tripDirection: 1,
            mode: 'departure',
            station: station(stationId),
            trip: t,
            stations,
            viewModes,
            bordersAfter: new Map(),
        });

    it('始発駅が隠れていれば、最初の時刻より上は上端まで「|」', () => {
        const t = trip('t', [
            ['新宿', null, '10:00:00'],
            ['羽沢', '10:30:00', '10:31:00'],
            ['西谷', '10:33:00', null],
        ]);
        expect(cell(t, '上端')).toBe('|');
        expect(cell(t, '下端')).toBe('=');
    });

    it('終着駅が隠れていれば、最後の時刻より下は下端まで「|」（終着の「=」を出さない）', () => {
        const t = trip('t', [
            ['羽沢', null, '10:31:00'],
            ['西谷', '10:33:00', '10:34:00'],
            ['海老名', '10:50:00', null],
        ]);
        expect(cell(t, '上端')).toBe('‥');
        expect(cell(t, '下端')).toBe('|');
    });

    it('始発・終着とも表示中なら従来どおり（上は「‥」、終着の直後は「=」）', () => {
        const t = trip('t', [
            ['羽沢', null, '10:31:00'],
            ['西谷', '10:33:00', null],
        ]);
        expect(cell(t, '上端')).toBe('‥');
        expect(cell(t, '下端')).toBe('=');
    });
});

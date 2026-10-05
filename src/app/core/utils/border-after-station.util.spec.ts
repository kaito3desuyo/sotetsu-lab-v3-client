import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { borderAfterStation } from './border-after-station.util';
import { visibleStations } from './visible-stations.util';

function makeStation(stationName: string, routeIds: string[]): any {
    return {
        stationId: stationName,
        stationName,
        routeStationLists: routeIds.map((routeId) => ({
            routeStationListId: `${stationName}-${routeId}`,
            route: { routeId, routeName: routeId },
        })),
    };
}

/**
 * 現行 get-border-setting.util.ts（timetable-all-line/utils/get-border-setting.util.ts）
 * のハードコード配列を期待値としたリグレッションテスト。
 * 全路線 ON 時、隣接駅ペアの所属路線が完全に入れ替わる（共通路線を持たない）位置は
 * 全て現行の境界駅と一致する必要がある。
 * 実DBの全線駅データはこのテストでは取得できないため、既存
 * timetable-all-line.util.spec.ts と同じ手法（駅名+所属路線のみを持つ最小駅オブジェクト）
 * で各境界駅と直後の他路線駅のペアを個別に再現する。
 */
describe('borderAfterStation（get-border-setting.util.ts への現行一致リグレッション）', () => {
    const tripDirection0Boundaries: {
        routeIds: string[];
        stationName: string;
    }[] = [
        { routeIds: ['りんかい線'], stationName: '大井町' },
        { routeIds: ['三田線'], stationName: '西高島平' },
        { routeIds: ['埼玉高速鉄道線'], stationName: '浦和美園' },
        { routeIds: ['東上本線'], stationName: '小川町' },
        { routeIds: ['秩父線'], stationName: '西武秩父' },
        { routeIds: ['西武有楽町線'], stationName: '新桜台' },
        { routeIds: ['有楽町線', '副都心線'], stationName: '地下鉄成増' },
        { routeIds: ['東横線'], stationName: '綱島' },
        { routeIds: ['本線'], stationName: '横浜' },
        { routeIds: ['本線'], stationName: '希望ヶ丘' },
        { routeIds: ['厚木線'], stationName: '厚木' },
    ];

    const tripDirection1Boundaries: {
        routeIds: string[];
        stationName: string;
    }[] = [
        { routeIds: ['相鉄・JR直通線'], stationName: '武蔵小杉' },
        { routeIds: ['りんかい線'], stationName: '新木場' },
        { routeIds: ['三田線'], stationName: '三田' },
        { routeIds: ['目黒線'], stationName: '奥沢' },
        { routeIds: ['東上本線'], stationName: '池袋' },
        { routeIds: ['池袋線'], stationName: '池袋' },
        { routeIds: ['西武有楽町線'], stationName: '新桜台' },
        { routeIds: ['有楽町線'], stationName: '新木場' },
        { routeIds: ['新横浜線', '相鉄・JR直通線'], stationName: '羽沢横浜国大' },
        { routeIds: ['みなとみらい線'], stationName: '元町・中華街' },
        { routeIds: ['いずみ野線'], stationName: '湘南台' },
        { routeIds: ['本線'], stationName: '海老名' },
    ];

    it.each(tripDirection0Boundaries)(
        '$stationName（$routeIds）は他路線駅との境界で罫線が立つ（tripDirection 0 相当）',
        ({ routeIds, stationName }) => {
            const current = makeStation(stationName, routeIds);
            const next = makeStation('隣接他路線駅', ['__unrelated__']);
            expect(borderAfterStation([current, next])).toEqual([
                true,
                false,
            ]);
        },
    );

    it.each(tripDirection1Boundaries)(
        '$stationName（$routeIds）は他路線駅との境界で罫線が立つ（tripDirection 1 相当）',
        ({ routeIds, stationName }) => {
            const current = makeStation(stationName, routeIds);
            const next = makeStation('隣接他路線駅', ['__unrelated__']);
            expect(borderAfterStation([current, next])).toEqual([
                true,
                false,
            ]);
        },
    );

    it('通常駅（かしわ台・本線）は同一路線の隣駅との間に罫線が立たない', () => {
        const current = makeStation('かしわ台', ['本線']);
        const next = makeStation('次駅', ['本線']);
        expect(borderAfterStation([current, next])).toEqual([false, false]);
    });

    it('分岐駅（二俣川・本線/いずみ野線）は隣駅と路線を共有する限り罫線が立たない', () => {
        const branch = makeStation('二俣川', ['本線', 'いずみ野線']);
        const honsenNeighbor = makeStation('大和', ['本線']);
        expect(borderAfterStation([honsenNeighbor, branch])).toEqual([
            false,
            false,
        ]);
    });
});

describe('borderAfterStation × visibleStations（B6 受け入れ条件: 路線絞り込みへの追従）', () => {
    const honsen = makeStation('かしわ台', ['本線']);
    const branch = makeStation('二俣川', ['本線', 'いずみ野線']);
    const atsugi = makeStation('厚木', ['厚木線']);
    const all: StationDetailsDto[] = [honsen, branch, atsugi];

    it('全路線 ON: 本線↔厚木線の境界にのみ罫線が立つ', () => {
        const visible = visibleStations(all, ['本線', 'いずみ野線', '厚木線']);
        expect(borderAfterStation(visible)).toEqual([false, true, false]);
    });

    it('1路線のみ選択（本線）: 境界駅（厚木線側）が非表示になり罫線が消える', () => {
        const visible = visibleStations(all, ['本線']);
        expect(visible.map((s) => s.stationName)).toEqual([
            'かしわ台',
            '二俣川',
        ]);
        expect(borderAfterStation(visible)).toEqual([false, false]);
    });

    it('2路線選択（本線・厚木線）: その境界のみ罫線が立つ', () => {
        const visible = visibleStations(all, ['本線', '厚木線']);
        expect(visible.map((s) => s.stationName)).toEqual([
            'かしわ台',
            '二俣川',
            '厚木',
        ]);
        expect(borderAfterStation(visible)).toEqual([false, true, false]);
    });
});

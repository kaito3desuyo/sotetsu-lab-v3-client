import { TimetableAllLineGetStationNumberingPipe } from './timetable-all-line-get-station-numbering.pipe';

describe('TimetableAllLineGetStationNumberingPipe', () => {
    const pipe = new TimetableAllLineGetStationNumberingPipe();

    it('路線ごとの駅番号を重複なしの昇順で返す', () => {
        const station = {
            routeStationLists: [
                { stationNumbering: 'TY13' },
                { stationNumbering: 'MG13' },
                { stationNumbering: 'SH03' },
                { stationNumbering: 'MG13' },
                { stationNumbering: null },
            ],
        } as never;
        expect(pipe.transform(station)).toEqual(['MG13', 'SH03', 'TY13']);
    });

    it('駅番号が無ければ空配列', () => {
        expect(pipe.transform({ routeStationLists: [] } as never)).toEqual([]);
        expect(pipe.transform({} as never)).toEqual([]);
    });
});

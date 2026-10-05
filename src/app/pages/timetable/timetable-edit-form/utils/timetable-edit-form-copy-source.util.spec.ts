import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import {
    buildCopySourceGroups,
    filterCopySourceGroups,
} from './timetable-edit-form-copy-source.util';

const stations = ['海老名', '二俣川', '横浜', '湘南台', '新宿'].map(
    (stationName) => ({ stationId: stationName, stationName }),
) as StationDetailsDto[];

// 届く順は sequence と逆
const tripClasses = [
    {
        tripClassId: 'jr',
        tripClassName: '特急（JR線直通）',
        tripClassColor: '#f00',
        sequence: 2,
    },
    {
        tripClassId: 'local',
        tripClassName: '各停',
        tripClassColor: '#000',
        sequence: 1,
    },
] as TripClassDetailsDto[];

/** [列番, 種別, [駅, 発][]][] */
function block(
    id: string,
    trips: [string, string, [string, string][]][],
): TripBlockDetailsDto {
    return {
        tripBlockId: id,
        trips: trips.map(([tripNumber, tripClassId, times]) => ({
            tripNumber,
            tripClassId,
            times: times
                .map(([stationId, departureTime], i) => ({
                    stationId,
                    departureTime,
                    stopSequence: i + 1,
                }))
                .reverse(),
        })),
    } as TripBlockDetailsDto;
}

const blocks = [
    block('b1', [
        [
            '0412',
            'local',
            [
                ['海老名', '06:12:00'],
                ['横浜', '06:50:00'],
            ],
        ],
    ]),
    block('b2', [
        [
            '0512',
            'local',
            [
                ['湘南台', '05:12:00'],
                ['横浜', '05:40:00'],
            ],
        ],
    ]),
    block('b3', [
        [
            '2001',
            'jr',
            [
                ['海老名', '00:10:00'],
                ['二俣川', '00:30:00'],
            ],
        ],
        ['2001K', 'jr', [['新宿', '01:00:00']]],
    ]),
    block('b4', [['9999', 'unknown', [['横浜', '10:00:00']]]]),
];

describe('buildCopySourceGroups', () => {
    const groups = buildCopySourceGroups(blocks, tripClasses, stations);

    it('種別の sequence 順にまとめ、分からない種別は最後。組の中は列番の順（発時刻の順ではない）', () => {
        expect(groups.map((g) => g.name)).toEqual([
            '各停',
            '特急（JR線直通）',
            '種別なし',
        ]);
        expect(groups[0].options.map((o) => o.tripBlockId)).toEqual([
            'b1',
            'b2',
        ]);
    });

    it('列番・始発駅・発時刻・終着駅を 1 行に。続く列車は → でつなぐ', () => {
        expect(groups[0].options[1].label).toBe('0512 湘南台 5:12 → 横浜');
        expect(groups[1].options[0].label).toBe(
            '2001 海老名 0:10 → 新宿 → 2001K',
        );
    });
});

describe('filterCopySourceGroups', () => {
    const groups = buildCopySourceGroups(blocks, tripClasses, stations);
    const ids = (query: string) =>
        filterCopySourceGroups(groups, query).flatMap((g) =>
            g.options.map((o) => o.tripBlockId),
        );

    it('空なら全部', () => {
        expect(ids('')).toEqual(['b1', 'b2', 'b3', 'b4']);
    });

    it('時刻は 512 / 0512 / 5:12 のどれでも当たる', () => {
        expect(ids('512')).toEqual(['b2']);
        expect(ids('0512')).toEqual(['b2']);
        expect(ids('5:12')).toEqual(['b2']);
    });

    it('駅名・種別名・続く列車の列番でも当たり、空白区切りは全部を満たすもの', () => {
        expect(ids('海老名')).toEqual(['b1', 'b3']);
        expect(ids('JR')).toEqual(['b3']);
        expect(ids('2001K')).toEqual(['b3']);
        expect(ids('海老名 各停')).toEqual(['b1']);
    });
});

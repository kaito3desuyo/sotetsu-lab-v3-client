import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { PickerDirection } from './pickable-train.interface';
import { buildPickableTrains } from './build-pickable-trains.util';

const NULL = null as unknown as string;

function time(o: Partial<TimeDetailsDto>): TimeDetailsDto {
    return { arrivalTime: NULL, departureTime: NULL, ...o } as TimeDetailsDto;
}

function trip(
    tripId: string,
    times: TimeDetailsDto[],
    o: {
        direction?: 0 | 1;
        operationNumber?: string | null;
        className?: string;
    } = {},
): TripDetailsDto {
    const operationNumber =
        o.operationNumber === undefined ? '62' : o.operationNumber;
    return {
        tripId,
        tripNumber: `N${tripId}`,
        tripDirection: o.direction ?? 1,
        tripClass: {
            tripClassName: o.className ?? '各停（SO）',
            tripClassColor: '#111111',
        },
        tripOperationLists: operationNumber
            ? [
                  {
                      operationId: `op-${operationNumber}`,
                      operation: { operationNumber },
                  },
              ]
            : [],
        times,
    } as unknown as TripDetailsDto;
}

function blocks(...trips: TripDetailsDto[]): TripBlockDetailsDto[] {
    return trips.map(
        (t) =>
            ({
                tripBlockId: `b${t.tripId}`,
                trips: [t],
            }) as TripBlockDetailsDto,
    );
}

const NAMES = new Map([
    ['st-yoko', '横浜'],
    ['st-futa', '二俣川'],
    ['st-ebina', '海老名'],
]);

/** 二俣川を dep に発つ（days=1）海老名行き */
function departing(
    tripId: string,
    dep: string,
    o: Parameters<typeof trip>[2] = {},
    days = 1,
): TripDetailsDto {
    return trip(
        tripId,
        [
            time({
                stationId: 'st-futa',
                stopSequence: 1,
                departureDays: days,
                departureTime: dep,
            }),
            time({
                stationId: 'st-ebina',
                stopSequence: 2,
                arrivalDays: days,
                arrivalTime: '23:59:00',
            }),
        ],
        o,
    );
}

function run(
    tripBlocks: TripBlockDetailsDto[],
    at: Date,
    o: {
        minutesBefore?: number;
        minutesAfter?: number;
        direction?: PickerDirection;
    } = {},
) {
    return buildPickableTrains({
        tripBlocks,
        stationId: 'st-futa',
        at,
        minutesBefore: o.minutesBefore ?? 5,
        minutesAfter: o.minutesAfter ?? 10,
        direction: o.direction ?? 'both',
        stationNameById: NAMES,
    });
}

const AT = new Date(2026, 10, 10, 7, 10, 0);

describe('buildPickableTrains', () => {
    it('その駅に時刻のある列車のうち、at の前後の幅に入るものを時刻順に返す', () => {
        const result = run(
            blocks(
                departing('6', '07:25:00'),
                departing('4', '07:13:00'),
                departing('1', '07:02:00'),
                departing('3', '07:12:00'),
                departing('2', '07:08:00'),
                departing('5', '07:16:00'),
            ),
            AT,
        );

        expect(result.map((r) => r.tripId)).toEqual(['2', '3', '4', '5']);
        expect(result.map((r) => r.isPast)).toEqual([
            true,
            false,
            false,
            false,
        ]);
        expect(result[0].time).toEqual(new Date(2026, 10, 10, 7, 8, 0));
    });

    it('幅の両端（at - before ちょうど・at + after ちょうど）を含む', () => {
        const result = run(
            blocks(departing('1', '07:05:00'), departing('2', '07:20:00')),
            AT,
        );

        expect(result.map((r) => r.tripId)).toEqual(['1', '2']);
    });

    it('運用番号を持たない列車と運用番号 100 の列車は出さない', () => {
        const result = run(
            blocks(
                departing('1', '07:08:00', { operationNumber: null }),
                departing('2', '07:09:00', { operationNumber: '100' }),
                departing('3', '07:11:00', { operationNumber: '' }),
                departing('4', '07:12:00'),
            ),
            AT,
        );

        expect(result.map((r) => r.tripId)).toEqual(['4']);
    });

    it('direction が inbound なら tripDirection 0 だけ、outbound なら 1 だけ、both なら両方', () => {
        const all = blocks(
            departing('in', '07:08:00', { direction: 0 }),
            departing('out', '07:12:00', { direction: 1 }),
        );

        expect(
            run(all, AT, { direction: 'inbound' }).map((r) => r.tripId),
        ).toEqual(['in']);
        expect(
            run(all, AT, { direction: 'outbound' }).map((r) => r.tripId),
        ).toEqual(['out']);
        const both = run(all, AT, { direction: 'both' });
        expect(both.map((r) => r.tripId)).toEqual(['in', 'out']);
        expect(both.map((r) => r.direction)).toEqual(['inbound', 'outbound']);
    });

    it('発が無く着だけの駅（当駅止まり）は着の時刻を使い isArrivalOnly=true', () => {
        const t = trip('1', [
            time({
                stationId: 'st-yoko',
                stopSequence: 1,
                departureTime: '06:50:00',
            }),
            time({
                stationId: 'st-futa',
                stopSequence: 2,
                arrivalTime: '07:12:00',
            }),
        ]);
        const through = departing('2', '07:13:00');

        const [row, other] = run(blocks(t, through), AT);

        expect(row.isArrivalOnly).toBe(true);
        expect(row.time).toEqual(new Date(2026, 10, 10, 7, 12, 0));
        expect(row.destinationName).toBe('二俣川');
        expect(other.isArrivalOnly).toBe(false);
    });

    it('時刻の無い通過駅（arrivalTime・departureTime とも null）の列車は出さない', () => {
        const t = trip('1', [
            time({
                stationId: 'st-yoko',
                stopSequence: 1,
                departureTime: '07:00:00',
            }),
            time({ stationId: 'st-futa', stopSequence: 2 }),
            time({
                stationId: 'st-ebina',
                stopSequence: 3,
                arrivalTime: '07:30:00',
            }),
        ]);

        expect(run(blocks(t), AT)).toEqual([]);
    });

    it('行先は最後の時刻のある停車点の駅名、種別は baseTripClassName を通した名前', () => {
        const t = trip(
            '1',
            [
                time({
                    stationId: 'st-futa',
                    stopSequence: 1,
                    departureTime: '07:12:00',
                }),
                time({
                    stationId: 'st-ebina',
                    stopSequence: 2,
                    arrivalTime: '07:40:00',
                }),
                time({ stationId: 'st-yoko', stopSequence: 3 }),
            ],
            { className: '快速（SO→TY）' },
        );

        const [row] = run(blocks(t), AT);

        expect(row).toMatchObject({
            tripId: '1',
            tripNumber: 'N1',
            tripClassName: '快速',
            tripClassColor: '#111111',
            destinationName: '海老名',
            operationNumber: '62',
            operationId: 'op-62',
        });
    });

    it('種別の色が無ければ #8a8a8a', () => {
        const t = departing('1', '07:12:00');
        (t as unknown as { tripClass: object }).tripClass = {
            tripClassName: '各停',
        };

        expect(run(blocks(t), AT)[0].tripClassColor).toBe('#8a8a8a');
    });

    it('displayTime は days=1 の 07:12:00 で 7:12、days=2 の 00:30:00 で 24:30', () => {
        const day1 = run(blocks(departing('1', '07:12:00')), AT);
        expect(day1[0].displayTime).toBe('7:12');

        const at = new Date(2026, 10, 11, 0, 32, 0); // 営業日 11/10 の 24:32
        const day2 = run(blocks(departing('2', '00:30:00', {}, 2)), at);
        expect(day2[0].displayTime).toBe('24:30');
    });

    it('3:50 に開くと前日の営業日の days=2 の 03:40〜04:00 を出す', () => {
        const at = new Date(2026, 10, 11, 3, 50, 0);

        const result = run(
            blocks(
                departing('late', '03:45:00', {}, 2),
                departing('first', '03:45:00', {}, 1),
            ),
            at,
            { minutesBefore: 10, minutesAfter: 10 },
        );

        expect(result.map((r) => r.tripId)).toEqual(['late']);
        expect(result[0].displayTime).toBe('27:45');
    });

    it('4:05 に開くと当日の営業日の days=1 の 03:55〜04:15 を出す', () => {
        const at = new Date(2026, 10, 11, 4, 5, 0);

        const result = run(
            blocks(
                departing('a', '04:10:00', {}, 1),
                departing('b', '04:10:00', {}, 2),
            ),
            at,
            { minutesBefore: 10, minutesAfter: 10 },
        );

        expect(result.map((r) => r.tripId)).toEqual(['a']);
    });
});

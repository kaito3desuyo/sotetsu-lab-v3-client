import { OperationItineraryLinkDto } from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

/**
 * ダイヤグラムの線の組み立てを照合する spec 用の小さな固定データ。
 * 駅は s1〜s5 の 1 路線。tripDirection は 0=上り・1=下り（s1→s5 が下り）。
 *
 *   運用 10A: D1（下り・出庫・s1→s3）→ U1（上り・入庫・s3→s1）  … s3 で折り返し
 *   運用 20A: D2（下り・s1→s5・0 時台をまたぐ・終点で別の運用 30B へ）
 *   運用 30B: U2（上り・s5→s1・0 時台・始点が別の運用 20A から）
 *   運用 40A: D3（下り・昼・s1→s5）→ U4（上り・s5→s1）           … s5 で折り返し
 */

export const FIXTURE_ROUTE_ID = 'snap-route';

const STATION_IDS = ['s1', 's2', 's3', 's4', 's5'];

export const FIXTURE_STATIONS: StationDetailsDto[] = STATION_IDS.map(
    (stationId) => ({
        stationId,
        stationName: `${stationId.toUpperCase()}駅`,
        stationSubname: null,
        stationType: 0,
        stationDescription: null,
        stationLatlng: null,
        stationUrl: null,
        wheelchairBoarding: false,
        createdAt: '',
        updatedAt: '',
    }),
);

export const FIXTURE_ROUTES: RouteDetailsDto[] = [
    {
        routeId: FIXTURE_ROUTE_ID,
        agencyId: 'snap-agency',
        routeNumber: null,
        routeName: '照合線',
        routeNickName: null,
        routeDescription: null,
        routeType: 2,
        routeUrl: null,
        routeColor: null,
        routeTextColor: null,
        createdAt: '',
        updatedAt: '',
        routeStationLists: FIXTURE_STATIONS.map((station, index) => ({
            routeStationListId: `snap-rsl-${index}`,
            routeId: FIXTURE_ROUTE_ID,
            stationId: station.stationId,
            stationSequence: index + 1,
            stationNumbering: null,
            station,
        })),
    },
];

const LOCAL: TripClassDetailsDto = {
    tripClassId: 'class-local',
    serviceId: 'snap-service',
    tripClassName: '各停',
    tripClassColor: '#336699',
    sequence: 1,
    createdAt: '',
    updatedAt: '',
};

const EXPRESS: TripClassDetailsDto = {
    tripClassId: 'class-express',
    serviceId: 'snap-service',
    tripClassName: '急行',
    tripClassColor: '#cc3333',
    sequence: 2,
    createdAt: '',
    updatedAt: '',
};

export const FIXTURE_TRIP_CLASSES: TripClassDetailsDto[] = [LOCAL, EXPRESS];

/**
 * [駅, 時刻（HH:mm:ss）, 日オフセット（1=当日・2=翌日の 0 時台）]。
 * 通過駅は API と同じく、時刻を null にした行で持つ（無いと線が組み立たない）。
 */
type Stop = [stationId: string, time: string | null, days: number | null];

function makeTimes(tripId: string, stops: Stop[]): TimeDetailsDto[] {
    return stops.map(([stationId, time, days], index) => {
        const isFirst = index === 0;
        const isLast = index === stops.length - 1;
        return {
            timeId: `${tripId}-time-${index}`,
            tripId,
            stationId,
            stopSequence: index + 1,
            pickupType: 0,
            dropoffType: 0,
            arrivalTime: isFirst ? null : time,
            arrivalDays: isFirst ? null : days,
            departureTime: isLast ? null : time,
            departureDays: isLast ? null : days,
        };
    });
}

interface TripSpec {
    tripId: string;
    tripNumber: string;
    tripDirection: 0 | 1;
    tripClass: TripClassDetailsDto;
    operationId: string;
    operationNumber: string;
    depotOut?: boolean;
    depotIn?: boolean;
    stops: Stop[];
}

function makeTrip(spec: TripSpec): TripDetailsDto {
    return {
        tripId: spec.tripId,
        serviceId: 'snap-service',
        tripNumber: spec.tripNumber,
        tripClassId: spec.tripClass.tripClassId,
        tripName: null,
        tripDirection: spec.tripDirection,
        tripBlockId: `block-${spec.tripId}`,
        depotIn: spec.depotIn ?? false,
        depotOut: spec.depotOut ?? false,
        calendarId: null,
        createdAt: '',
        updatedAt: '',
        times: makeTimes(spec.tripId, spec.stops),
        tripClass: spec.tripClass,
        tripOperationLists: [
            {
                tripOperationListId: `tol-${spec.tripId}`,
                tripId: spec.tripId,
                operationId: spec.operationId,
                startTimeId: null,
                endTimeId: null,
                startStationId: null,
                endStationId: null,
                createdAt: '',
                updatedAt: '',
                operation: {
                    operationId: spec.operationId,
                    calendarId: 'snap-calendar',
                    operationNumber: spec.operationNumber,
                    createdAt: '',
                    updatedAt: '',
                },
            },
        ],
    };
}

const D1 = makeTrip({
    tripId: 'D1',
    tripNumber: '801K',
    tripDirection: 1,
    tripClass: LOCAL,
    operationId: 'op-10A',
    operationNumber: '10A',
    depotOut: true,
    stops: [
        ['s1', '08:00:00', 1],
        ['s2', '08:10:00', 1],
        ['s3', '08:20:00', 1],
    ],
});

const U1 = makeTrip({
    tripId: 'U1',
    tripNumber: '802K',
    tripDirection: 0,
    tripClass: EXPRESS,
    operationId: 'op-10A',
    operationNumber: '10A',
    depotIn: true,
    stops: [
        ['s3', '08:30:00', 1],
        ['s2', '08:38:00', 1],
        ['s1', '08:50:00', 1],
    ],
});

const D2 = makeTrip({
    tripId: 'D2',
    tripNumber: '2301K',
    tripDirection: 1,
    tripClass: EXPRESS,
    operationId: 'op-20A',
    operationNumber: '20A',
    stops: [
        ['s1', '23:40:00', 1],
        ['s2', null, null],
        ['s3', '00:10:00', 2],
        ['s4', null, null],
        ['s5', '00:40:00', 2],
    ],
});

const U2 = makeTrip({
    tripId: 'U2',
    tripNumber: '2302K',
    tripDirection: 0,
    tripClass: LOCAL,
    operationId: 'op-30B',
    operationNumber: '30B',
    stops: [
        ['s5', '00:50:00', 2],
        ['s4', '01:00:00', 2],
        ['s3', '01:10:00', 2],
        ['s2', null, null],
        ['s1', '01:40:00', 2],
    ],
});

const D3 = makeTrip({
    tripId: 'D3',
    tripNumber: '1201K',
    tripDirection: 1,
    tripClass: LOCAL,
    operationId: 'op-40A',
    operationNumber: '40A',
    stops: [
        ['s1', '12:00:00', 1],
        ['s2', '12:10:00', 1],
        ['s3', '12:20:00', 1],
        ['s4', '12:30:00', 1],
        ['s5', '12:40:00', 1],
    ],
});

const U4 = makeTrip({
    tripId: 'U4',
    tripNumber: '1202K',
    tripDirection: 0,
    tripClass: LOCAL,
    operationId: 'op-40A',
    operationNumber: '40A',
    stops: [
        ['s5', '12:55:00', 1],
        ['s4', '13:05:00', 1],
        ['s3', '13:15:00', 1],
        ['s2', '13:25:00', 1],
        ['s1', '13:35:00', 1],
    ],
});

function asBlock(trip: TripDetailsDto): TripBlockDetailsDto {
    return { tripBlockId: trip.tripBlockId, trips: [trip] };
}

/** 方向 → 運行ブロック（キーは tripDirection。0=上り・1=下り） */
export const FIXTURE_TRIP_BLOCKS_BY_DIRECTION: Record<
    number,
    TripBlockDetailsDto[]
> = {
    0: [U1, U2, U4].map(asBlock),
    1: [D1, D2, D3].map(asBlock),
};

/** D2 の終点（s5）で別の運用 30B の U2 へ乗り移る（hasTransfer 用） */
export const FIXTURE_ITINERARY_LINKS: OperationItineraryLinkDto[] = [
    {
        tripOperationListId: 'tol-D2',
        tripId: 'D2',
        operationId: 'op-20A',
        previous: null,
        next: {
            tripOperationListId: 'tol-U2',
            tripId: 'U2',
            operationId: 'op-30B',
            operationNumber: '30B',
            stationId: 's5',
            rule: 2,
        },
    },
    {
        tripOperationListId: 'tol-U2',
        tripId: 'U2',
        operationId: 'op-30B',
        previous: {
            tripOperationListId: 'tol-D2',
            tripId: 'D2',
            operationId: 'op-20A',
            operationNumber: '20A',
            stationId: 's5',
            rule: 2,
        },
        next: null,
    },
];

/** selectedTripInfo を取るときに選ぶ列車（折り返しの着く側・出庫の列車） */
export const FIXTURE_SELECTED_TRIP_ID = 'D1';

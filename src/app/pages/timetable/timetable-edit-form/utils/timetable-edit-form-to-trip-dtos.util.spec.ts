import { CreateTripDto } from 'src/app/libs/trip/usecase/dtos/create-trip.dto';
import { ReplaceTripDto } from 'src/app/libs/trip/usecase/dtos/replace-trip.dto';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import {
    ETimetableEditFormMode,
    ETimetableEditFormStopType,
} from '../enums/timetable-edit-form.enum';
import { ITimetableEditFormTripValue } from '../interfaces/timetable-edit-form.interface';
import { toTripDtos } from './timetable-edit-form-to-trip-dtos.util';

type TimeValue = ITimetableEditFormTripValue['times'][number];

const time = (
    stationId: string,
    stopType: ETimetableEditFormStopType,
    arrivalTime: string | null,
    departureTime: string | null,
): TimeValue => ({
    timeId: null,
    tripId: null,
    stationId,
    stopId: null,
    stopType,
    arrivalTime,
    departureTime,
});

const trip = (
    overrides: Partial<ITimetableEditFormTripValue>,
): ITimetableEditFormTripValue => ({
    tripId: null,
    serviceId: 'service',
    tripNumber: '1001',
    tripClassId: 'local',
    tripName: '',
    tripDirection: ETripDirection.OUTBOUND,
    tripBlockId: null,
    depotIn: false,
    depotOut: false,
    calendarId: 'calendar',
    extraCalendarId: null,
    times: [],
    operationId: '',
    tripOperationLists: [],
    nextTripOperationListId: null,
    ...overrides,
});

const { STOP, PASS, NOT_GOING_THROUGH } = ETimetableEditFormStopType;

describe('toTripDtos', () => {
    it('登録は CreateTripDto、更新は ReplaceTripDto にする', () => {
        expect(
            toTripDtos([trip({})], ETimetableEditFormMode.ADD)[0],
        ).toBeInstanceOf(CreateTripDto);
        expect(
            toTripDtos([trip({})], ETimetableEditFormMode.UPDATE)[0],
        ).toBeInstanceOf(ReplaceTripDto);
    });

    it('列車番号が空なら「不明」にする', () => {
        const [dto] = toTripDtos(
            [trip({ tripNumber: '' })],
            ETimetableEditFormMode.ADD,
        );

        expect(dto.tripNumber).toBe('不明');
    });

    it('経由しない駅を除き、始発の着と終着の発を落として停車順を振る', () => {
        const [dto] = toTripDtos(
            [
                trip({
                    times: [
                        time('a', STOP, '05:00', '05:01'),
                        time('b', NOT_GOING_THROUGH, null, null),
                        time('c', PASS, null, '05:05'),
                        time('d', STOP, '05:10', '05:11'),
                    ],
                }),
            ],
            ETimetableEditFormMode.ADD,
        );

        expect(dto.times).toEqual([
            expect.objectContaining({
                stationId: 'a',
                stopSequence: 1,
                pickupType: 0,
                dropoffType: 1,
                arrivalDays: null,
                arrivalTime: null,
                departureDays: 1,
                departureTime: '05:01',
            }),
            expect.objectContaining({
                stationId: 'c',
                stopSequence: 2,
                pickupType: 1,
                dropoffType: 1,
                arrivalTime: null,
                departureTime: '05:05',
            }),
            expect.objectContaining({
                stationId: 'd',
                stopSequence: 3,
                pickupType: 1,
                dropoffType: 0,
                arrivalDays: 1,
                arrivalTime: '05:10',
                departureDays: null,
                departureTime: null,
            }),
        ]);
    });

    it('4 時より前の時刻は翌日（2 日目）とする', () => {
        const [dto] = toTripDtos(
            [
                trip({
                    times: [
                        time('a', STOP, null, '23:50'),
                        time('b', STOP, '00:10', null),
                    ],
                }),
            ],
            ETimetableEditFormMode.ADD,
        );

        expect(dto.times[0].departureDays).toBe(1);
        expect(dto.times[1].arrivalDays).toBe(2);
    });

    it('運用を選んでいれば、最初と最後の駅で運用に付ける', () => {
        const [withOperation, withoutOperation] = toTripDtos(
            [
                trip({
                    operationId: 'op-12',
                    times: [
                        time('a', STOP, null, '05:01'),
                        time('b', STOP, '05:10', null),
                    ],
                }),
                trip({}),
            ],
            ETimetableEditFormMode.ADD,
        );

        expect(withOperation.tripOperationLists).toEqual([
            expect.objectContaining({
                operationId: 'op-12',
                startStationId: 'a',
                endStationId: 'b',
            }),
        ]);
        expect(withoutOperation.tripOperationLists).toEqual([]);
    });
});

describe('区間の送り返し', () => {
    const buildDtos = (overrides: Partial<ITimetableEditFormTripValue>) =>
        toTripDtos(
            [
                trip({
                    times: [
                        time('a', STOP, null, '05:01'),
                        time('b', STOP, '05:10', null),
                    ],
                    ...overrides,
                }),
            ],
            ETimetableEditFormMode.UPDATE,
        );

    it('区間が 1 つの列車は id と次の運用を送り返す', () => {
        const dtos = buildDtos({
            operationId: 'op-11K',
            tripOperationLists: [
                {
                    id: 'seg-1',
                    operationId: 'op-11K',
                    nextTripOperationListId: 'seg-9',
                },
            ],
            nextTripOperationListId: 'seg-9',
        });

        expect(dtos[0].tripOperationLists).toEqual([
            expect.objectContaining({
                id: 'seg-1',
                operationId: 'op-11K',
                nextTripOperationListId: 'seg-9',
            }),
        ]);
    });

    it('運番を変えても id は残す', () => {
        const dtos = buildDtos({
            operationId: 'op-12K',
            tripOperationLists: [
                {
                    id: 'seg-1',
                    operationId: 'op-11K',
                    nextTripOperationListId: null,
                },
            ],
        });

        expect(dtos[0].tripOperationLists[0]).toEqual(
            expect.objectContaining({
                id: 'seg-1',
                operationId: 'op-12K',
                nextTripOperationListId: null,
            }),
        );
    });

    it('区間が 2 つ以上の列車は区間をそのまま送り返す', () => {
        const original = [
            {
                id: 's1',
                operationId: 'op-18K',
                startStationId: 'a',
                endStationId: 'b',
                nextTripOperationListId: null,
            },
            {
                id: 's2',
                operationId: 'op-02K',
                startStationId: 'b',
                endStationId: 'c',
                nextTripOperationListId: null,
            },
        ];
        const dtos = buildDtos({
            operationId: 'op-18K',
            tripOperationLists: original,
        });

        expect(dtos[0].tripOperationLists).toEqual(
            original.map((o) => expect.objectContaining(o)),
        );
    });

    it('新しい列車（区間なし）は今どおり id なしで 1 つ作る', () => {
        const dtos = buildDtos({ operationId: 'op-11K' });

        expect(dtos[0].tripOperationLists).toEqual([
            expect.objectContaining({ operationId: 'op-11K' }),
        ]);
        expect(
            (dtos[0].tripOperationLists[0] as { id?: string }).id,
        ).toBeUndefined();
    });
});

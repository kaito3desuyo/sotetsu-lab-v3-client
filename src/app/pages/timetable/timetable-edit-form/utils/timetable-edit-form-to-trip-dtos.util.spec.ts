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

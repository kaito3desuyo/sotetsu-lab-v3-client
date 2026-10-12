import { FormBuilder, Validators } from '@angular/forms';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import {
    ETimetableEditFormMode,
    ETimetableEditFormStopType,
} from '../enums/timetable-edit-form.enum';
import { buildTripFormGroup } from './timetable-edit-form-trip-form.util';

const stations = ['a', 'b', 'c'].map(
    (stationId) => ({ stationId }) as StationDetailsDto,
);

const base = {
    fb: new FormBuilder(),
    stations,
    serviceId: 'service',
    calendarId: 'calendar',
    tripDirection: ETripDirection.INBOUND,
};

const trip = {
    tripId: 'trip-1',
    tripNumber: '1001',
    tripClassId: 'local',
    tripBlockId: 'block-1',
    depotIn: true,
    depotOut: false,
    times: [
        {
            timeId: 'time-a',
            tripId: 'trip-1',
            stationId: 'a',
            stopId: 'stop-a',
            pickupType: 0,
            dropoffType: 1,
            departureTime: '05:01:00',
        },
        {
            timeId: 'time-c',
            tripId: 'trip-1',
            stationId: 'c',
            stopId: 'stop-c',
            pickupType: 1,
            dropoffType: 1,
            departureTime: '05:10:00',
        },
    ],
    tripOperationLists: [{ operationId: 'op-12' }],
} as TripDetailsDto;

describe('buildTripFormGroup', () => {
    it('列車が無ければ、全駅「経由しない」の空の列車にする', () => {
        const form = buildTripFormGroup({
            ...base,
            mode: ETimetableEditFormMode.ADD,
        });

        expect(form.getRawValue()).toEqual(
            expect.objectContaining({
                tripId: null,
                serviceId: 'service',
                tripNumber: '',
                tripClassId: '',
                tripDirection: ETripDirection.INBOUND,
                calendarId: 'calendar',
                operationId: '',
            }),
        );
        expect(form.getRawValue().times.map((t) => t.stopType)).toEqual([
            ETimetableEditFormStopType.NOT_GOING_THROUGH,
            ETimetableEditFormStopType.NOT_GOING_THROUGH,
            ETimetableEditFormStopType.NOT_GOING_THROUGH,
        ]);
        expect(
            form.controls.tripClassId.hasValidator(Validators.required),
        ).toBe(true);
        expect(form.controls.times.validator).not.toBeNull();
    });

    it('列車があれば、駅ごとに時刻を HH:mm で入れ、停・通過・経由しないを分ける', () => {
        const form = buildTripFormGroup({
            ...base,
            mode: ETimetableEditFormMode.UPDATE,
            trip,
        });
        const times = form.getRawValue().times;

        expect(
            times.map((t) => [t.stationId, t.stopType, t.departureTime]),
        ).toEqual([
            ['a', ETimetableEditFormStopType.STOP, '05:01'],
            ['b', ETimetableEditFormStopType.NOT_GOING_THROUGH, null],
            ['c', ETimetableEditFormStopType.PASS, '05:10'],
        ]);
        expect(times[0]).toEqual(
            expect.objectContaining({ timeId: 'time-a', stopId: 'stop-a' }),
        );
        expect(form.getRawValue()).toEqual(
            expect.objectContaining({
                tripId: 'trip-1',
                tripBlockId: 'block-1',
                depotIn: true,
                operationId: 'op-12',
            }),
        );
    });

    it('運用番号を入れるのは更新のときだけ', () => {
        const form = buildTripFormGroup({
            ...base,
            mode: ETimetableEditFormMode.COPY,
            trip,
        });

        expect(form.getRawValue().operationId).toBe('');
    });
});

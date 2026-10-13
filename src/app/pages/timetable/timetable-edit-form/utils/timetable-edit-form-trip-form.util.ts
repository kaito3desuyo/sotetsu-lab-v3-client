import { FormBuilder, Validators } from '@angular/forms';
import { format, parse } from 'date-fns';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import {
    ETimetableEditFormMode,
    ETimetableEditFormStopType,
} from '../enums/timetable-edit-form.enum';
import {
    ITimetableEditFormOriginalSegment,
    ITimetableEditFormTrip,
    ITimetableEditFormTripTime,
} from '../interfaces/timetable-edit-form.interface';
import { TimetableEditFormValidator } from '../validators/timetable-edit-form.validator';

/**
 * 1 列車ぶんのフォームを作る。列車があればその値で埋め（運用番号は更新のときだけ）、
 * 無ければ全駅「経由しない」の空の列車にする。times は stations と同じ並び。
 */
export function buildTripFormGroup({
    fb,
    stations,
    serviceId,
    calendarId,
    tripDirection,
    mode,
    trip,
}: {
    fb: FormBuilder;
    stations: readonly StationDetailsDto[];
    serviceId: string;
    calendarId: string;
    tripDirection: ETripDirection | null;
    mode: ETimetableEditFormMode;
    trip?: TripDetailsDto;
}): ITimetableEditFormTrip {
    if (trip) {
        return fb.group({
            tripId: [trip.tripId],
            serviceId: [serviceId, [Validators.required]],
            tripNumber: [trip.tripNumber, []],
            tripClassId: [trip.tripClassId, [Validators.required]],
            tripName: [''],
            tripDirection: [tripDirection, [Validators.required]],
            tripBlockId: [trip.tripBlockId],
            depotIn: [trip.depotIn],
            depotOut: [trip.depotOut],
            calendarId: [calendarId, [Validators.required]],
            extraCalendarId: [null],
            times: fb.array(
                stations.map((station) =>
                    buildTripTimeFormGroup({
                        fb,
                        station,
                        time: trip.times?.find(
                            (o) => o.stationId === station.stationId,
                        ),
                    }),
                ),
                [
                    TimetableEditFormValidator.stopsStationCountShouldBeGreaterAndEqualThanTwo,
                    TimetableEditFormValidator.stopTimesShouldBeLaterThanPrevStopTimes,
                ],
            ),
            operationId: [
                {
                    value:
                        mode === ETimetableEditFormMode.UPDATE &&
                        trip.tripOperationLists?.length
                            ? (trip.tripOperationLists[0].operationId ?? '')
                            : '',
                    // 区間が 2 つ以上の列車は、ここでは運番を変えない（区間を潰さない）
                    disabled:
                        mode === ETimetableEditFormMode.UPDATE &&
                        (trip.tripOperationLists?.length ?? 0) > 1,
                },
            ],
            /** 元の区間（表示しない）。保存で id とつながりを送り返すため */
            tripOperationLists: [
                (mode === ETimetableEditFormMode.UPDATE
                    ? (trip.tripOperationLists ?? []).map((o) => ({
                          id: o.tripOperationListId,
                          operationId: o.operationId ?? '',
                          startStationId: o.startStationId,
                          endStationId: o.endStationId,
                          nextTripOperationListId:
                              o.nextTripOperationListId ?? null,
                      }))
                    : []) as ITimetableEditFormOriginalSegment[],
            ],
            nextTripOperationListId: [
                (mode === ETimetableEditFormMode.UPDATE &&
                trip.tripOperationLists?.length === 1
                    ? (trip.tripOperationLists[0].nextTripOperationListId ??
                      null)
                    : null) as string | null,
            ],
        });
    }

    return fb.group({
        tripId: [null],
        serviceId: [serviceId, [Validators.required]],
        tripNumber: ['', []],
        tripClassId: ['', [Validators.required]],
        tripName: [''],
        tripDirection: [tripDirection, [Validators.required]],
        tripBlockId: [null],
        depotIn: [false],
        depotOut: [false],
        calendarId: [calendarId, [Validators.required]],
        extraCalendarId: [null],
        times: fb.array(
            stations.map((station) => buildTripTimeFormGroup({ fb, station })),
            [
                TimetableEditFormValidator.stopsStationCountShouldBeGreaterAndEqualThanTwo,
                TimetableEditFormValidator.stopTimesShouldBeLaterThanPrevStopTimes,
            ],
        ),
        operationId: [''],
        tripOperationLists: [[] as ITimetableEditFormOriginalSegment[]],
        nextTripOperationListId: [null as string | null],
    });
}

/** 1 駅ぶんの時刻のフォーム。乗降とも扱わない駅は通過、時刻は `HH:mm` にする */
function buildTripTimeFormGroup({
    fb,
    station,
    time,
}: {
    fb: FormBuilder;
    station: StationDetailsDto;
    time?: TimeDetailsDto;
}): ITimetableEditFormTripTime {
    if (time) {
        return fb.group({
            timeId: [time.timeId],
            tripId: [time.tripId],
            stationId: [station.stationId, [Validators.required]],
            stopId: [time.stopId],
            stopType: [
                (time.pickupType === 1 && time.dropoffType === 1
                    ? ETimetableEditFormStopType.PASS
                    : ETimetableEditFormStopType.STOP) as ETimetableEditFormStopType,
            ],
            arrivalTime: [
                time.arrivalTime
                    ? format(
                          parse(time.arrivalTime, 'HH:mm:ss', new Date()),
                          'HH:mm',
                      )
                    : null,
            ],
            departureTime: [
                time.departureTime
                    ? format(
                          parse(time.departureTime, 'HH:mm:ss', new Date()),
                          'HH:mm',
                      )
                    : null,
            ],
        });
    }

    return fb.group({
        timeId: [null],
        tripId: [null],
        stationId: [station.stationId, [Validators.required]],
        stopId: [null],
        stopType: [
            ETimetableEditFormStopType.NOT_GOING_THROUGH as ETimetableEditFormStopType,
        ],
        arrivalTime: [null],
        departureTime: [null],
    });
}

import { FormArray } from '@angular/forms';
import { format, getHours, parse } from 'date-fns';
import { CreateTripDto } from 'src/app/libs/trip/usecase/dtos/create-trip.dto';
import { ReplaceTripDto } from 'src/app/libs/trip/usecase/dtos/replace-trip.dto';
import {
    ETimetableEditFormMode,
    ETimetableEditFormStopType,
} from '../enums/timetable-edit-form.enum';
import {
    ITimetableEditFormOriginalSegment,
    ITimetableEditFormTrip,
} from '../interfaces/timetable-edit-form.interface';

/**
 * 列車のフォームの値を、保存する DTO にする。経由しない駅は落とし、始発の着・終着の発は
 * 持たせず、4 時より前の時刻は翌日（2 日目）とする。運用を選んだ列車は最初と最後の駅で付ける。
 */
export function toTripDtos(
    trips: FormArray<ITimetableEditFormTrip>['value'],
    mode: ETimetableEditFormMode,
): CreateTripDto[] | ReplaceTripDto[] {
    return trips.map((trip) => {
        const times = trip.times.filter(
            (o) => o.stopType !== ETimetableEditFormStopType.NOT_GOING_THROUGH,
        );
        const timeDtos = times.map((time, index, arr) => {
            const arrivalTime =
                time.arrivalTime && index !== 0
                    ? parse(time.arrivalTime, 'HH:mm', new Date())
                    : null;
            const departureTime =
                time.departureTime && index !== arr.length - 1
                    ? parse(time.departureTime, 'HH:mm', new Date())
                    : null;

            return {
                timeId: time.timeId ?? undefined,
                stationId: time.stationId,
                stopId: time.stopId,
                stopSequence: index + 1,
                pickupType:
                    time.stopType === ETimetableEditFormStopType.STOP &&
                    index !== arr.length - 1
                        ? 0
                        : 1,
                dropoffType:
                    time.stopType === ETimetableEditFormStopType.STOP &&
                    index !== 0
                        ? 0
                        : 1,
                arrivalDays:
                    arrivalTime && index !== 0
                        ? getHours(arrivalTime) < 4
                            ? 2
                            : 1
                        : null,
                arrivalTime:
                    arrivalTime && index !== 0
                        ? format(arrivalTime, 'HH:mm')
                        : null,
                departureDays:
                    departureTime && index !== arr.length - 1
                        ? getHours(departureTime) < 4
                            ? 2
                            : 1
                        : null,
                departureTime:
                    departureTime && index !== arr.length - 1
                        ? format(departureTime, 'HH:mm')
                        : null,
            };
        });
        const tripFields = {
            serviceId: trip.serviceId,
            tripNumber: trip.tripNumber || '不明',
            tripClassId: trip.tripClassId,
            tripName: trip.tripName,
            tripDirection: trip.tripDirection,
            depotIn: trip.depotIn,
            depotOut: trip.depotOut,
            calendarId: trip.calendarId,
            extraCalendarId: trip.extraCalendarId,
        };
        const tripOperationLists = buildTripOperationLists(trip, times);

        if (mode === ETimetableEditFormMode.UPDATE) {
            const dto: ReplaceTripDto = {
                ...tripFields,
                tripId: trip.tripId ?? undefined,
                times: timeDtos,
                tripOperationLists,
            };
            return dto;
        }

        // 登録・コピーは ID を持たせない（コピー元の ID がフォームに残っていても落とす）
        const dto: CreateTripDto = {
            ...tripFields,
            times: timeDtos.map(({ timeId, ...rest }) => rest),
            tripOperationLists: tripOperationLists.map(
                ({ id, ...rest }) => rest,
            ),
        };
        return dto;
    }) as CreateTripDto[] | ReplaceTripDto[];
}

/**
 * 区間の送り返し。区間が 2 つ以上なら元のまま、1 つなら id とつながりを残して運番・駅を今の値にする。
 * id を落とすと API は区間を作り直し、つながり（次の運用）が消える
 */
function buildTripOperationLists(
    trip: {
        operationId?: string;
        tripOperationLists?: ITimetableEditFormOriginalSegment[];
        nextTripOperationListId?: string | null;
    },
    times: { stationId?: string }[],
) {
    const original = trip.tripOperationLists ?? [];
    if (original.length > 1) {
        return original.map((o) => ({
            id: o.id,
            operationId: o.operationId,
            startStationId: o.startStationId,
            endStationId: o.endStationId,
            nextTripOperationListId: o.nextTripOperationListId ?? null,
        }));
    }
    if (!trip.operationId) return [];
    return [
        {
            id: original[0]?.id,
            operationId: trip.operationId,
            startStationId: times[0]?.stationId ?? null,
            endStationId: times[times.length - 1]?.stationId ?? null,
            nextTripOperationListId: trip.nextTripOperationListId ?? null,
        },
    ];
}

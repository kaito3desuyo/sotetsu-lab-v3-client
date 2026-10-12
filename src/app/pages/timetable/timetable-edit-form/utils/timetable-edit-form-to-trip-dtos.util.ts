import { FormArray } from '@angular/forms';
import { plainToClass } from 'class-transformer';
import { format, getHours, parse } from 'date-fns';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { CreateTripDto } from 'src/app/libs/trip/usecase/dtos/create-trip.dto';
import { ReplaceTripDto } from 'src/app/libs/trip/usecase/dtos/replace-trip.dto';
import {
    ETimetableEditFormMode,
    ETimetableEditFormStopType,
} from '../enums/timetable-edit-form.enum';
import { ITimetableEditFormTrip } from '../interfaces/timetable-edit-form.interface';

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

        return plainToClass(
            mode === ETimetableEditFormMode.UPDATE
                ? ReplaceTripDto
                : CreateTripDto,
            {
                ...trip,
                tripId: trip.tripId ?? undefined,
                tripNumber: trip.tripNumber || '不明',
                times: times.map((time, index, arr) => {
                    const arrivalTime =
                        time.arrivalTime && index !== 0
                            ? parse(time.arrivalTime, 'HH:mm', new Date())
                            : null;
                    const departureTime =
                        time.departureTime && index !== arr.length - 1
                            ? parse(time.departureTime, 'HH:mm', new Date())
                            : null;

                    return {
                        ...time,
                        timeId: time.timeId ?? undefined,
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
                }),
                tripOperationLists: trip.operationId
                    ? [
                          {
                              operationId: trip.operationId,
                              startStationId: times[0]?.stationId ?? null,
                              endStationId:
                                  times[times.length - 1]?.stationId ?? null,
                          },
                      ]
                    : [],
            },
            classTransformerOptions,
        );
    });
}

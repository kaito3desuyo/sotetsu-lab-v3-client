import { inject, Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import dayjs from 'dayjs';
import { forkJoin, Observable, Subject } from 'rxjs';
import { SocketService } from 'src/app/core/services/socket.service';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { IOperationPostCardForm } from '../interfaces/operation-post-card-form.interface';

@Injectable()
export class OperationPostCardService {
    readonly #socket = inject(SocketService);
    readonly #formationService = inject(FormationService);
    readonly #operationService = inject(OperationService);
    readonly #operationSightingService = inject(OperationSightingService);
    readonly #todaysCalendarListQuery = inject(TodaysCalendarListStateQuery);

    readonly #submitOperationSightingEvent = new Subject<void>();

    receiveSubmitOperationSightingEvent(): Observable<void> {
        return this.#submitOperationSightingEvent.asObservable();
    }

    async addOperationSighting(
        formValue: IOperationPostCardForm,
    ): Promise<void> {
        const todaysCalendarId = this.#todaysCalendarListQuery.todaysCalendarId;
        const emptyQb = RequestQueryBuilder.create();
        const formationQb = RequestQueryBuilder.create()
            .setJoin([
                { field: 'vehicleFormations' },
                { field: 'vehicleFormations.vehicle' },
            ])
            .search({
                $or: [
                    {
                        formationNumber: {
                            [CondOperator.EQUALS]:
                                formValue.formationOrVehicleNumber,
                        },
                    },
                    {
                        'vehicleFormations.vehicle.vehicleNumber': {
                            [CondOperator.EQUALS]:
                                formValue.formationOrVehicleNumber,
                        },
                    },
                ],
            });
        const operationQb = RequestQueryBuilder.create().setFilter([
            {
                field: 'calendarId',
                operator: CondOperator.EQUALS,
                value: todaysCalendarId,
            },
            {
                field: 'operationNumber',
                operator: CondOperator.EQUALS,
                value: formValue.operationNumber,
            },
        ]);
        const now = dayjs();
        const isLateNight = now.hour() < 4;

        const [formations, operations] = await forkJoin([
            this.#formationService.findManyBySpeficicDate(formationQb, {
                date: now
                    .subtract(isLateNight ? 1 : 0, 'days')
                    .format('YYYY-MM-DD'),
            }),
            this.#operationService.findMany(operationQb),
        ]).toPromise();

        if (!Array.isArray(formations) || !formations.length) {
            throw new Error('存在しない編成・車両番号です');
        }

        if (!Array.isArray(operations) || !operations.length) {
            throw new Error('存在しない運用番号です');
        }

        let sightingTime = now.clone();
        if (formValue.sightingTime) {
            const st = dayjs(formValue.sightingTime, 'HH:mm');

            if (isLateNight) {
                sightingTime = st.subtract(st.hour() >= 4 ? 1 : 0, 'day');
            } else {
                sightingTime = st.add(st.hour() < 4 ? 1 : 0, 'day');
            }

            if (sightingTime.isAfter(now)) {
                throw new Error('未来の時刻を入力することはできません');
            }
        }

        const currentPosition = await this.#operationService
            .findOneWithCurrentPosition(operations[0].operationId, emptyQb)
            .toPromise();

        if (
            !currentPosition.position.prev &&
            !currentPosition.position.current &&
            currentPosition.position.next
        ) {
            const firstTripDepartureTime = dayjs(
                currentPosition.position.next.startTime.departureTime,
                'HH:mm:ss',
            )
                .add(
                    currentPosition.position.next.startTime.departureDays - 1,
                    'day',
                )
                .subtract(isLateNight ? 1 : 0, 'day');

            if (now.isBefore(firstTripDepartureTime.subtract(30, 'minute'))) {
                throw new Error(
                    `${operations[0].operationNumber}運の最初の列車が発車するより30分以上前の時刻を入力することはできません`,
                );
            }
        }

        const result = await this.#operationSightingService
            .createOne(emptyQb, {
                formationId: formations[0].formationId,
                operationId: operations[0].operationId,
                sightingTime: sightingTime.toISOString(),
            })
            .toPromise();

        this.#socket.emit('sendSighting', result);
        this.#submitOperationSightingEvent.next();
    }
}

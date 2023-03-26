import { Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import dayjs, { Dayjs } from 'dayjs';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { map, mergeMap, take, tap } from 'rxjs/operators';
import { SocketService } from 'src/app/core/services/socket.service';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { IOperationPostCardForm } from '../interfaces/operation-post-card-form.interface';

@Injectable()
export class OperationPostCardService {
    private readonly _submitOperationSightingEvent = new Subject<void>();

    constructor(
        private readonly socket: SocketService,
        private readonly formationService: FormationService,
        private readonly operationService: OperationService,
        private readonly operationSightingService: OperationSightingService,
        private readonly todaysCalendarListQuery: TodaysCalendarListStateQuery
    ) {}

    receiveSubmitOperationSightingEvent(): Observable<void> {
        return this._submitOperationSightingEvent.asObservable();
    }

    addOperationSighting(formValue: IOperationPostCardForm): Observable<void> {
        return of(undefined).pipe(
            mergeMap(() =>
                this.todaysCalendarListQuery.todaysCalendarId$.pipe(take(1))
            ),
            map((calendarId) => {
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
                        value: calendarId,
                    },
                    {
                        field: 'operationNumber',
                        operator: CondOperator.EQUALS,
                        value: formValue.operationNumber,
                    },
                ]);

                return { formationQb, operationQb };
            }),
            mergeMap(({ formationQb, operationQb }) =>
                forkJoin([
                    this.formationService.findManyBySpeficicDate(formationQb, {
                        date: dayjs()
                            .subtract(dayjs().hour() < 4 ? 1 : 0, 'days')
                            .format('YYYY-MM-DD'),
                    }),
                    this.operationService.findMany(operationQb),
                ])
            ),
            map<
                [FormationDetailsDto[], OperationDetailsDto[]],
                [FormationDetailsDto[], OperationDetailsDto[], Dayjs]
            >(([formations, operations]) => {
                if (!formations.length) {
                    throw new Error('存在しない編成・車両番号です');
                }

                if (!operations.length) {
                    throw new Error('存在しない運用番号です');
                }

                let sightingTime = dayjs();
                if (formValue.sightingTime) {
                    const now = dayjs();
                    const st = dayjs(formValue.sightingTime, 'HH:mm');
                    if (now.hour() < 4) {
                        sightingTime = st.subtract(
                            st.hour() >= 4 ? 1 : 0,
                            'day'
                        );
                    } else {
                        sightingTime = st.add(st.hour() < 4 ? 1 : 0, 'day');
                    }
                    if (sightingTime.isAfter(now)) {
                        throw new Error('未来の時刻を入力することはできません');
                    }
                }

                return [formations, operations, sightingTime];
            }),
            mergeMap(([formations, operations, sightingTime]) => {
                const qb = new RequestQueryBuilder();
                return this.operationSightingService.createOne(qb, {
                    formationId: formations[0].formationId,
                    operationId: operations[0].operationId,
                    sightingTime: sightingTime.toISOString(),
                });
            }),
            tap((result) => {
                this.socket.emit('sendSighting', result);
                this._submitOperationSightingEvent.next();
            }),
            map(() => undefined)
        );
    }
}

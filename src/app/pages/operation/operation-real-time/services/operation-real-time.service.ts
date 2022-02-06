import { Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import dayjs from 'dayjs';
import { forkJoin, Observable } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import {
    OperationRealTimeStateQuery,
    OperationRealTimeStateStore,
} from '../states/operation-real-time.state';

@Injectable()
export class OperationRealTimeService {
    constructor(
        private readonly todaysCalendarListStateQuery: TodaysCalendarListStateQuery,
        private readonly operationRealTimeStateStore: OperationRealTimeStateStore,
        private readonly operationRealTimeStateQuery: OperationRealTimeStateQuery,
        private readonly operationService: OperationService,
        private readonly formationService: FormationService,
        private readonly operationSightingService: OperationSightingService,
        private readonly tripClassService: TripClassService
    ) {}

    // v2

    fetchOperationsV2(): Observable<void> {
        const qb = new RequestQueryBuilder()
            .setFilter([
                {
                    field: 'calendarId',
                    operator: CondOperator.EQUALS,
                    value: this.todaysCalendarListStateQuery.todaysCalendarId,
                },
            ])
            .sortBy([{ field: 'operationNumber', order: 'ASC' }]);

        return this.operationService.findMany(qb).pipe(
            tap((data: OperationDetailsDto[]) => {
                this.operationRealTimeStateStore.setOperations(data);
            }),
            map(() => undefined)
        );
    }

    fetchFormationsV2(): Observable<void> {
        const qb = new RequestQueryBuilder();

        return this.formationService
            .findManyBySpeficicDate(qb, {
                date: dayjs()
                    .subtract(dayjs().hour() < 4 ? 1 : 0, 'days')
                    .format('YYYY-MM-DD'),
            })
            .pipe(
                tap((data: FormationDetailsDto[]) => {
                    this.operationRealTimeStateStore.setFormations(data);
                }),
                map(() => undefined)
            );
    }

    fetchOperationSightings(): Observable<void> {
        const qb = new RequestQueryBuilder().setJoin([
            { field: 'operation' },
            { field: 'formation' },
        ]);

        return this.operationSightingService
            .findManyLatestGroupByOperation(qb)
            .pipe(
                tap((data: OperationSightingDetailsDto[]) => {
                    this.operationRealTimeStateStore.setOperationSightings(
                        data
                    );
                }),
                tap(() => {
                    this.operationRealTimeStateStore.updateFinalUpdateTime();
                }),
                map(() => undefined)
            );
    }

    fetchFormationSightings(): Observable<void> {
        const qb = new RequestQueryBuilder().setJoin([
            { field: 'operation' },
            { field: 'formation' },
        ]);

        return this.operationSightingService
            .findManyLatestGroupByFormation(qb)
            .pipe(
                tap((data: OperationSightingDetailsDto[]) => {
                    this.operationRealTimeStateStore.setFormationSightings(
                        data
                    );
                }),
                tap(() => {
                    this.operationRealTimeStateStore.updateFinalUpdateTime();
                }),
                map(() => undefined)
            );
    }

    fetchOperationCurrentPosition(): Observable<void> {
        const qb = new RequestQueryBuilder();

        return this.operationRealTimeStateQuery.operations$.pipe(
            take(1),
            switchMap((operations) =>
                forkJoin(
                    operations.map((op) =>
                        this.operationService.findOneWithCurrentPosition(
                            op.operationId,
                            qb
                        )
                    )
                )
            ),
            tap((data) => {
                this.operationRealTimeStateStore.setCurrentPositions(data);
            }),
            map(() => undefined)
        );
    }

    fetchTripClassesV2(): Observable<void> {
        const qb = new RequestQueryBuilder()
            .setJoin([{ field: 'service' }])
            .setFilter([
                {
                    field: 'service.serviceName',
                    operator: CondOperator.EQUALS,
                    value: '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
                },
            ]);

        return this.tripClassService.findMany(qb).pipe(
            tap((data: TripClassDetailsDto[]) => {
                this.operationRealTimeStateStore.setTripClasses(data);
            }),
            map(() => undefined)
        );
    }
}
import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import dayjs from 'dayjs';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { FormationApiService } from 'src/app/general/api/formation-api.service';
import { OperationApiService } from 'src/app/general/api/operation-api.service';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import {
    OperationPastTimeStateQuery,
    OperationPastTimeStateStore,
} from '../../states/operation-past-time.state';

@Injectable()
export class OperationPastTimeService {
    private _operationSightings$: BehaviorSubject<IOperationSighting[]> =
        new BehaviorSubject<IOperationSighting[]>([]);
    operationSightings$: Observable<IOperationSighting[]> =
        this._operationSightings$.asObservable();

    constructor(
        private formationApi: FormationApiService,
        private operationApi: OperationApiService,
        private readonly formationService: FormationService,
        private readonly operationPastTimeStateStore: OperationPastTimeStateStore,
        private readonly operationPastTimeStateQuery: OperationPastTimeStateQuery
    ) {}

    fetchOperationSightings(): Observable<void> {
        const referenceDate = this.operationPastTimeStateQuery.referenceDate;
        const days = this.operationPastTimeStateQuery.days;

        if (!referenceDate || !days) {
            return of(null).pipe(
                tap(() => {
                    this._operationSightings$.next([]);
                })
            );
        }

        const start = dayjs(referenceDate, 'YYYY-MM-DD')
            .hour(4)
            .minute(0)
            .second(0)
            .millisecond(0)
            .toISOString();
        const end = dayjs(referenceDate, 'YYYY-MM-DD')
            .hour(4)
            .minute(0)
            .second(0)
            .millisecond(0)
            .add(days, 'days')
            .toISOString();

        return this.operationApi
            .getOperationSightings({
                start_sighting_time: start,
                end_sighting_time: end,
            })
            .pipe(
                tap((data) => {
                    this._operationSightings$.next(data);
                }),
                map(() => null)
            );
    }

    // v2

    fetchFormationsV2(): Observable<void> {
        const referenceDate = this.operationPastTimeStateQuery.referenceDate;
        const days = this.operationPastTimeStateQuery.days;

        if (!referenceDate || !days) {
            this.operationPastTimeStateStore.setFormations([]);
            return of(null);
        }

        const format = 'YYYY-MM-DD';
        const refDate = dayjs(referenceDate, format);
        const start = refDate.format(format);
        const end = refDate.add(days - 1, 'days').format(format);
        const qb = new RequestQueryBuilder();

        return this.formationService
            .findManyBySpecificPeriod(qb, {
                startDate: start,
                endDate: end,
            })
            .pipe(
                tap((formations: FormationDetailsDto[]) => {
                    this.operationPastTimeStateStore.setFormations(formations);
                }),
                map(() => undefined)
            );
    }
}

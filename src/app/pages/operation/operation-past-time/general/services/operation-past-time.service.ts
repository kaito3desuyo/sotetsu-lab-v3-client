import { Injectable } from '@angular/core';
import dayjs from 'dayjs';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { FormationApiService } from 'src/app/general/api/formation-api.service';
import { OperationApiService } from 'src/app/general/api/operation-api.service';
import { IFormation } from 'src/app/general/interfaces/formation';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import { FormationModel } from 'src/app/general/models/formation/formation-model';
import { OperationPastTimeStateQuery } from '../../states/operation-past-time.state';

@Injectable()
export class OperationPastTimeService {
    private _formations$: BehaviorSubject<IFormation[]> = new BehaviorSubject<
        IFormation[]
    >([]);
    formations$: Observable<IFormation[]> = this._formations$.asObservable();

    private _operationSightings$: BehaviorSubject<IOperationSighting[]> =
        new BehaviorSubject<IOperationSighting[]>([]);
    operationSightings$: Observable<IOperationSighting[]> =
        this._operationSightings$.asObservable();

    constructor(
        private formationApi: FormationApiService,
        private operationApi: OperationApiService,
        private readonly operationPastTimeStateQuery: OperationPastTimeStateQuery
    ) {}

    fetchFormations(): Observable<void> {
        const referenceDate = this.operationPastTimeStateQuery.referenceDate;
        const days = this.operationPastTimeStateQuery.days;

        if (!referenceDate || !days) {
            return of(null).pipe(
                tap(() => {
                    this._formations$.next([]);
                })
            );
        }

        const start = dayjs(referenceDate, 'YYYY-MM-DD').format('YYYY-MM-DD');
        const end = dayjs(referenceDate, 'YYYY-MM-DD')
            .add(days - 1, 'days')
            .format('YYYY-MM-DD');

        return this.formationApi
            .searchFormations({
                start_date: start,
                end_date: end,
            })
            .pipe(
                map((data) =>
                    data.formations.map((o) =>
                        FormationModel.readFormationDtoImpl(o)
                    )
                ),
                tap((data) => {
                    this._formations$.next(data);
                }),
                map(() => null)
            );
    }

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
}

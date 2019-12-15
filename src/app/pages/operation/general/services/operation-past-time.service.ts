import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { OperationApiService } from 'src/app/general/api/operation-api.service';
import { tap, map } from 'rxjs/operators';
import { Moment } from 'moment';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';

@Injectable()
export class OperationPastTimeService {
    private _referenceDate$: BehaviorSubject<Moment> = new BehaviorSubject<
        Moment
    >(null);
    referenceDate$: Observable<Moment> = this._referenceDate$.asObservable();
    set referenceDate(date: Moment) {
        this._referenceDate$.next(date);
    }

    private _days$: BehaviorSubject<number> = new BehaviorSubject<number>(null);
    days$: Observable<number> = this._days$.asObservable();
    set days(days: number) {
        this._days$.next(days);
    }

    private _operationSightings$: BehaviorSubject<
        IOperationSighting[]
    > = new BehaviorSubject<IOperationSighting[]>([]);
    operationSightings$: Observable<
        IOperationSighting[]
    > = this._operationSightings$.asObservable();

    constructor(private operationApi: OperationApiService) {}

    fetchOperationSightings(): Observable<void> {
        if (!this._referenceDate$.getValue() || !this._days$.getValue()) {
            this._operationSightings$.next([]);
            return;
        }

        const start = this._referenceDate$
            .getValue()
            .hour(4)
            .minute(0)
            .second(0)
            .millisecond(0)
            .toISOString();

        const end = this._referenceDate$
            .getValue()
            .hour(4)
            .minute(0)
            .second(0)
            .millisecond(0)
            .add(this._days$.getValue(), 'days')
            .toISOString();

        return this.operationApi
            .getOperationSightings({
                start_sighting_time: start,
                end_sighting_time: end
            })
            .pipe(
                tap(data => {
                    this._operationSightings$.next(data);
                }),
                map(() => null)
            );
    }
}

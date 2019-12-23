import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, forkJoin, zip } from 'rxjs';
import { OperationApiService } from 'src/app/general/api/operation-api.service';
import { tap, map, take } from 'rxjs/operators';
import { Moment } from 'moment';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import { IFormation } from 'src/app/general/interfaces/formation';
import { FormationApiService } from 'src/app/general/api/formation-api.service';
import { FormationModel } from 'src/app/general/models/formation/formation-model';
import { cloneDeep } from 'lodash';
import { CalendarApiService } from 'src/app/general/api/calendar-api.service';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { CalendarModel } from 'src/app/general/models/calendar/calendar-model';

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

    private _calendars$: BehaviorSubject<
        { date: Moment; calendar: ICalendar }[]
    > = new BehaviorSubject<{ date: Moment; calendar: ICalendar }[]>(null);
    calendars$: Observable<
        { date: Moment; calendar: ICalendar }[]
    > = this._calendars$.asObservable();

    private _formations$: BehaviorSubject<IFormation[]> = new BehaviorSubject<
        IFormation[]
    >([]);
    formations$: Observable<IFormation[]> = this._formations$.asObservable();

    private _operationSightings$: BehaviorSubject<
        IOperationSighting[]
    > = new BehaviorSubject<IOperationSighting[]>([]);
    operationSightings$: Observable<
        IOperationSighting[]
    > = this._operationSightings$.asObservable();

    constructor(
        private calendarApi: CalendarApiService,
        private formationApi: FormationApiService,
        private operationApi: OperationApiService
    ) {}

    fetchFormations(): Observable<void> {
        if (!this._referenceDate$.getValue() || !this._days$.getValue()) {
            return of(null).pipe(
                tap(() => {
                    this._formations$.next([]);
                })
            );
        }

        const referenceDate = cloneDeep(this._referenceDate$.getValue());
        const start = referenceDate.format('YYYY-MM-DD');
        const end = referenceDate
            .add(this._days$.getValue() - 1, 'days')
            .format('YYYY-MM-DD');

        return this.formationApi
            .searchFormations({
                start_date: start,
                end_date: end
            })
            .pipe(
                map(data =>
                    data.formations.map(o =>
                        FormationModel.readFormationDtoImpl(o)
                    )
                ),
                tap(data => {
                    this._formations$.next(data);
                }),
                map(() => null)
            );
    }

    fetchOperationSightings(): Observable<void> {
        if (!this._referenceDate$.getValue() || !this._days$.getValue()) {
            return of(null).pipe(
                tap(() => {
                    this._operationSightings$.next([]);
                })
            );
        }

        const referenceDate = cloneDeep(this._referenceDate$.getValue());
        const start = referenceDate
            .hour(4)
            .minute(0)
            .second(0)
            .millisecond(0)
            .toISOString();
        const end = referenceDate
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

    fetchCalendars(): Observable<void> {
        if (!this._referenceDate$.getValue() || !this._days$.getValue()) {
            return of(null).pipe(
                tap(() => {
                    this._calendars$.next([]);
                })
            );
        }

        const days = this._days$.getValue();
        const observers: Observable<{
            date: Moment;
            calendar: ICalendar;
        }>[] = [];

        for (let i = 0; i < days; i++) {
            const referenceDate = cloneDeep(this._referenceDate$.getValue());
            const target = referenceDate.add(i, 'days');

            observers.push(
                this.calendarApi
                    .searchCalendars({
                        date: target.format('YYYY-MM-DD')
                    })
                    .pipe(
                        map(data =>
                            data.calendars.map(o =>
                                CalendarModel.readCalendarDtoImpl(o)
                            )
                        ),
                        map(data => {
                            return {
                                date: target,
                                calendar: data[0]
                            };
                        })
                    )
            );
        }

        return forkJoin(observers).pipe(
            tap(data => {
                this._calendars$.next(data);
            }),
            map(() => null)
        );
    }
}

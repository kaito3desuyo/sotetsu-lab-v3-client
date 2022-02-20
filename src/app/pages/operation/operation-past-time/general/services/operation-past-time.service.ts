import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, forkJoin, zip } from 'rxjs';
import { OperationApiService } from 'src/app/general/api/operation-api.service';
import { tap, map, take } from 'rxjs/operators';
import moment, { Moment } from 'moment';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import { IFormation } from 'src/app/general/interfaces/formation';
import { FormationApiService } from 'src/app/general/api/formation-api.service';
import { FormationModel } from 'src/app/general/models/formation/formation-model';
import { cloneDeep } from 'lodash-es';
import { CalendarApiService } from 'src/app/general/api/calendar-api.service';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { CalendarModel } from 'src/app/general/models/calendar/calendar-model';
import { OperationPastTimeStateQuery } from '../../states/operation-past-time.state';
import dayjs from 'dayjs';

@Injectable()
export class OperationPastTimeService {
    private _calendars$: BehaviorSubject<
        { date: Moment; calendar: ICalendar }[]
    > = new BehaviorSubject<{ date: Moment; calendar: ICalendar }[]>(null);
    calendars$: Observable<{ date: Moment; calendar: ICalendar }[]> =
        this._calendars$.asObservable();

    private _formations$: BehaviorSubject<IFormation[]> = new BehaviorSubject<
        IFormation[]
    >([]);
    formations$: Observable<IFormation[]> = this._formations$.asObservable();

    private _operationSightings$: BehaviorSubject<IOperationSighting[]> =
        new BehaviorSubject<IOperationSighting[]>([]);
    operationSightings$: Observable<IOperationSighting[]> =
        this._operationSightings$.asObservable();

    constructor(
        private calendarApi: CalendarApiService,
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

    fetchCalendars(): Observable<void> {
        const referenceDate = this.operationPastTimeStateQuery.referenceDate;
        const days = this.operationPastTimeStateQuery.days;

        if (!referenceDate || !days) {
            return of(null).pipe(
                tap(() => {
                    this._calendars$.next([]);
                })
            );
        }

        const observers: Observable<{
            date: Moment;
            calendar: ICalendar;
        }>[] = [];

        for (let i = 0; i < days; i++) {
            const target = moment(referenceDate, 'YYYY-MM-DD').add(i, 'days');

            observers.push(
                this.calendarApi
                    .searchCalendars({
                        date: target.format('YYYY-MM-DD'),
                    })
                    .pipe(
                        map((data) =>
                            data.calendars.map((o) =>
                                CalendarModel.readCalendarDtoImpl(o)
                            )
                        ),
                        map((data) => {
                            return {
                                date: target,
                                calendar: data[0],
                            };
                        })
                    )
            );
        }

        return forkJoin(observers).pipe(
            tap((data) => {
                this._calendars$.next(data);
            }),
            map(() => null)
        );
    }
}

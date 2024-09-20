import { Injectable } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { guid, Query, Store } from '@datorama/akita';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { arrayUniqueBy } from 'src/app/core/utils/array-unique-by';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { TimetableAllLineUtil } from '../utils/timetable-all-line.util';

type TimetableAllLineState = {
    calendarId: CalendarDetailsDto['calendarId'];
    tripDirection: TripDetailsDto['tripDirection'];
    tripBlockId: TripBlockDetailsDto['tripBlockId'];
    stations: StationDetailsDto[];
    tripBlocks: TripBlockDetailsDto[];
    pageSettings: PageEvent;
};

@Injectable()
export class TimetableAllLineStateStore extends Store<TimetableAllLineState> {
    constructor() {
        super(
            {
                calendarId: null,
                tripDirection: null,
                tripBlockId: null,
                stations: [],
                tripBlocks: [],
                pageSettings: {
                    pageIndex: 0,
                    pageSize: 10,
                    length: 0,
                },
            },
            {
                name: `TimetableAllLine-${guid()}`,
            },
        );
    }

    setCalendarId(calendarId: CalendarDetailsDto['calendarId']): void {
        this.update({
            calendarId,
        });
    }

    setTripDirection(tripDirection: TripDetailsDto['tripDirection']): void {
        this.update({
            tripDirection,
        });
    }

    setTripBlockId(tripBlockId: TripBlockDetailsDto['tripBlockId']): void {
        this.update({
            tripBlockId,
        });
    }

    setStations(stations: StationDetailsDto[]): void {
        this.update({
            stations,
        });
    }

    setTripBlocks(tripBlocks: TripBlockDetailsDto[]): void {
        this.update({
            tripBlocks,
        });
    }

    setPageSettings(pageSettings: PageEvent): void {
        this.update({
            pageSettings,
        });
    }

    updatePageSettings(pageSettings: Partial<PageEvent>): void {
        this.update({
            pageSettings: {
                ...this.getValue().pageSettings,
                ...pageSettings,
            },
        });
    }
}

@Injectable()
export class TimetableAllLineStateQuery extends Query<TimetableAllLineState> {
    readonly calendarId$ = this.select('calendarId');
    readonly tripDirection$ = this.select('tripDirection');
    readonly stations$ = this.select(['tripDirection', 'stations']).pipe(
        map(({ tripDirection, stations }) => {
            return tripDirection === 0 ? [...stations].reverse() : stations;
        }),
    );
    readonly trips$ = combineLatest([
        this.select(['tripDirection', 'stations', 'tripBlocks']).pipe(
            map(({ tripDirection, stations, tripBlocks }) => {
                const sortedStations =
                    tripDirection === 0 ? [...stations].reverse() : stations;

                const sortedTrips = arrayUniqueBy(
                    TimetableAllLineUtil.sortTrips(
                        sortedStations,
                        tripBlocks,
                    ).reverse(),
                    'tripBlockId',
                )
                    .reverse()
                    .map((o) => o.trips)
                    .reduce((a, b) => [...a, ...b], []);

                return sortedTrips;
            }),
        ),
        this.select('pageSettings'),
    ]).pipe(
        map(([trips, pageSettings]) => {
            return trips.filter((_, i) => {
                return (
                    pageSettings.pageIndex * pageSettings.pageSize <= i &&
                    i < (pageSettings.pageIndex + 1) * pageSettings.pageSize
                );
            });
        }),
    );
    readonly pageSettings$ = this.select('pageSettings');

    get calendarId(): CalendarDetailsDto['calendarId'] {
        return this.getValue().calendarId;
    }

    get tripDirection(): TripDetailsDto['tripDirection'] {
        return this.getValue().tripDirection;
    }

    get tripBlockId(): TripBlockDetailsDto['tripBlockId'] {
        return this.getValue().tripBlockId;
    }

    constructor(protected store: TimetableAllLineStateStore) {
        super(store);
    }
}

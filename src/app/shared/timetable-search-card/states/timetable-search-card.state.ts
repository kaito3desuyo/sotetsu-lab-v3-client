import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { ITimetableSearchCardForm } from '../interfaces/timetable-search-card-form';

type TimetableSearchCardState = ITimetableSearchCardForm & {};

@Injectable()
export class TimetableSearchCardStateStore extends Store<TimetableSearchCardState> {
    constructor() {
        super(
            {
                calendarId: null,
                tripDirection: 0,
                searchByStation: false,
                stationId: null,
            },
            { name: `TimetableSearchCard-${guid()}` }
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

    enableSearchByStation(): void {
        this.update({
            searchByStation: true,
        });
    }

    disableSearchByStation(): void {
        this.update({
            searchByStation: true,
        });
    }

    setStationId(stationId: StationDetailsDto['stationId']): void {
        this.update({
            stationId,
        });
    }
}

@Injectable()
export class TimetableSearchCardStateQuery extends Query<TimetableSearchCardState> {
    readonly formState$ = this.select([
        'calendarId',
        'tripDirection',
        'searchByStation',
        'stationId',
    ]);

    constructor(protected store: TimetableSearchCardStateStore) {
        super(store);
    }
}

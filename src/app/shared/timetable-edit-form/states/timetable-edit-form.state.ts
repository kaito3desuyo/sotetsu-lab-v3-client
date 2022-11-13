import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';
import { map } from 'rxjs/operators';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { ETimetableEditFormMode } from '../special/enums/timetable-edit-form.enum';

type State = {
    calendarId: string;
    mode: ETimetableEditFormMode;
    tripDirection: ETripDirection;
    stations: StationDetailsDto[];
    operations: OperationDetailsDto[];
    tripClasses: TripClassDetailsDto[];
    isSaveTripsIndividually: boolean;
};

@Injectable()
export class TimetableEditFormStateStore extends Store<State> {
    constructor() {
        super(
            {
                calendarId: null,
                mode: null,
                tripDirection: null,
                stations: [],
                operations: [],
                tripClasses: [],
                isSaveTripsIndividually: false,
            },
            { name: `TimetableEditForm-${guid()}` }
        );
    }

    setCalendarId(calendarId: string) {
        this.update({ calendarId });
    }

    setMode(mode: ETimetableEditFormMode): void {
        this.update({ mode });
    }

    setTripDirection(tripDirection: ETripDirection): void {
        this.update({ tripDirection });
    }

    setStations(stations: StationDetailsDto[]): void {
        this.update({ stations });
    }

    setOperations(operations: OperationDetailsDto[]): void {
        this.update({ operations });
    }

    setTripClasses(tripClasses: TripClassDetailsDto[]): void {
        this.update({ tripClasses });
    }

    setIsSaveTripsIndividually(bool: boolean): void {
        this.update({ isSaveTripsIndividually: bool });
    }
}

@Injectable()
export class TimetableEditFormStateQuery extends Query<State> {
    readonly calendarId$ = this.select('calendarId');
    readonly mode$ = this.select('mode');
    readonly tripDirection$ = this.select('tripDirection');
    readonly stations$ = this.select(['tripDirection', 'stations']).pipe(
        map(({ tripDirection, stations }) => {
            return tripDirection === ETripDirection.INBOUND
                ? [...stations].reverse()
                : stations;
        })
    );
    readonly operations$ = this.select('operations');
    readonly tripClasses$ = this.select('tripClasses');

    get calendarId(): string {
        return this.getValue().calendarId;
    }

    get mode(): ETimetableEditFormMode {
        return this.getValue().mode;
    }

    get isSaveTripsIndividually(): boolean {
        return this.getValue().isSaveTripsIndividually;
    }

    constructor(protected store: TimetableEditFormStateStore) {
        super(store);
    }
}

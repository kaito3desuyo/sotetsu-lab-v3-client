import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';
import { map } from 'rxjs/operators';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { ETimetableEditFormMode } from '../special/enums/timetable-edit-form.enum';
import { arrayUniqueBy } from 'src/app/core/utils/array-unique-by';
import { TimetableAllLineUtil } from 'src/app/pages/timetable/timetable-all-line/utils/timetable-all-line.util';

type State = {
    calendarId: string;
    tripBlockId: string;
    mode: ETimetableEditFormMode;
    tripDirection: ETripDirection;
    stations: StationDetailsDto[];
    operations: OperationDetailsDto[];
    tripClasses: TripClassDetailsDto[];
    tripBlocks: TripBlockDetailsDto[];
    isSaveTripsIndividually: boolean;
};

@Injectable()
export class TimetableEditFormStateStore extends Store<State> {
    constructor() {
        super(
            {
                calendarId: null,
                tripBlockId: null,
                mode: null,
                tripDirection: null,
                stations: [],
                operations: [],
                tripClasses: [],
                tripBlocks: [],
                isSaveTripsIndividually: false,
            },
            { name: `TimetableEditForm-${guid()}` }
        );
    }

    setCalendarId(calendarId: string): void {
        this.update({ calendarId });
    }

    setTripBlockId(tripBlockId: string): void {
        this.update({ tripBlockId });
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

    setTripBlocks(tripBlocks: TripBlockDetailsDto[]): void {
        this.update({ tripBlocks });
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
    readonly trips$ = this.select([
        'tripDirection',
        'stations',
        'tripBlocks',
    ]).pipe(
        map(({ tripDirection, stations, tripBlocks }) => {
            const sortedStations =
                tripDirection === 0 ? [...stations].reverse() : stations;

            const sortedTrips = arrayUniqueBy(
                TimetableAllLineUtil.sortTrips(
                    sortedStations,
                    tripBlocks
                ).reverse(),
                'tripBlockId'
            )
                .reverse()
                .map((o) => o.trips)
                .reduce((a, b) => [...a, ...b], []);

            return sortedTrips;
        })
    );

    get calendarId(): string {
        return this.getValue().calendarId;
    }

    get tripBlockId(): string {
        return this.getValue().tripBlockId;
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

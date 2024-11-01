import { inject, Injectable } from '@angular/core';
import { select, setProps } from '@ngneat/elf';
import { map } from 'rxjs/operators';
import { arrayUniqueBy } from 'src/app/core/utils/array-unique-by';
import { createElfStore } from 'src/app/core/utils/elf-store';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TimetableAllLineUtil } from 'src/app/pages/timetable/timetable-all-line/utils/timetable-all-line.util';
import { ETimetableEditFormMode } from '../special/enums/timetable-edit-form.enum';

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
export class TimetableEditFormStateStore {
    readonly state = createElfStore<State>({
        name: 'TimetableEditForm',
        initialValue: {
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
    });

    setCalendarId(calendarId: string): void {
        this.state.update(
            setProps({
                calendarId,
            }),
        );
    }

    setTripBlockId(tripBlockId: string): void {
        this.state.update(
            setProps({
                tripBlockId,
            }),
        );
    }

    setMode(mode: ETimetableEditFormMode): void {
        this.state.update(
            setProps({
                mode,
            }),
        );
    }

    setTripDirection(tripDirection: ETripDirection): void {
        this.state.update(
            setProps({
                tripDirection,
            }),
        );
    }

    setStations(stations: StationDetailsDto[]): void {
        this.state.update(
            setProps({
                stations,
            }),
        );
    }

    setOperations(operations: OperationDetailsDto[]): void {
        this.state.update(
            setProps({
                operations,
            }),
        );
    }

    setTripClasses(tripClasses: TripClassDetailsDto[]): void {
        this.state.update(
            setProps({
                tripClasses,
            }),
        );
    }

    setTripBlocks(tripBlocks: TripBlockDetailsDto[]): void {
        this.state.update(
            setProps({
                tripBlocks,
            }),
        );
    }

    setIsSaveTripsIndividually(bool: boolean): void {
        this.state.update(
            setProps({
                isSaveTripsIndividually: bool,
            }),
        );
    }
}

@Injectable()
export class TimetableEditFormStateQuery {
    readonly #store = inject(TimetableEditFormStateStore);

    readonly calendarId$ = this.#store.state.pipe(
        select((state) => state.calendarId),
    );
    readonly mode$ = this.#store.state.pipe(select((state) => state.mode));
    readonly tripDirection$ = this.#store.state.pipe(
        select((state) => state.tripDirection),
    );
    readonly stations$ = this.#store.state.pipe(
        select((state) => ({
            tripDirection: state.tripDirection,
            stations: state.stations,
        })),
        map(({ tripDirection, stations }) => {
            return tripDirection === ETripDirection.INBOUND
                ? [...stations].reverse()
                : stations;
        }),
    );
    readonly operations$ = this.#store.state.pipe(
        select((state) => state.operations),
    );
    readonly tripClasses$ = this.#store.state.pipe(
        select((state) => state.tripClasses),
    );
    readonly trips$ = this.#store.state.pipe(
        select((state) => ({
            tripDirection: state.tripDirection,
            stations: state.stations,
            tripBlocks: state.tripBlocks,
        })),
        map(({ tripDirection, stations, tripBlocks }) => {
            const sortedStations =
                tripDirection === ETripDirection.INBOUND
                    ? [...stations].reverse()
                    : stations;

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
    );

    get calendarId(): string {
        const { calendarId } = this.#store.state.getValue();
        return calendarId;
    }

    get tripBlockId(): string {
        const { tripBlockId } = this.#store.state.getValue();
        return tripBlockId;
    }

    get mode(): ETimetableEditFormMode {
        const { mode } = this.#store.state.getValue();
        return mode;
    }

    get isSaveTripsIndividually(): boolean {
        const { isSaveTripsIndividually } = this.#store.state.getValue();
        return isSaveTripsIndividually;
    }
}

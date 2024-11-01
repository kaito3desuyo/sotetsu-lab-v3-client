import { inject, Injectable } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { select, setProps } from '@ngneat/elf';
import { map } from 'rxjs/operators';
import { arrayUniqueBy } from 'src/app/core/utils/array-unique-by';
import { createElfStore } from 'src/app/core/utils/elf-store';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { TimetableAllLineUtil } from '../utils/timetable-all-line.util';

type State = {
    calendarId: CalendarDetailsDto['calendarId'];
    tripDirection: TripDetailsDto['tripDirection'];
    tripBlockId: TripBlockDetailsDto['tripBlockId'];
    stations: StationDetailsDto[];
    tripBlocks: TripBlockDetailsDto[];
    pageSettings: PageEvent;
};

@Injectable()
export class TimetableAllLineStateStore {
    readonly state = createElfStore<State>({
        name: 'TimetableAllLine',
        initialValue: {
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
    });

    setCalendarId(calendarId: CalendarDetailsDto['calendarId']): void {
        this.state.update(
            setProps({
                calendarId,
            }),
        );
    }

    setTripDirection(tripDirection: TripDetailsDto['tripDirection']): void {
        this.state.update(
            setProps({
                tripDirection,
            }),
        );
    }

    setTripBlockId(tripBlockId: TripBlockDetailsDto['tripBlockId']): void {
        this.state.update(
            setProps({
                tripBlockId,
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

    setTripBlocks(tripBlocks: TripBlockDetailsDto[]): void {
        this.state.update(
            setProps({
                tripBlocks,
            }),
        );
    }

    setPageSettings(pageSettings: PageEvent): void {
        this.state.update(
            setProps({
                pageSettings,
            }),
        );
    }

    updatePageSettings(pageSettings: Partial<PageEvent>): void {
        this.state.update(
            setProps((state) => ({
                pageSettings: {
                    ...state.pageSettings,
                    ...pageSettings,
                },
            })),
        );
    }
}

@Injectable()
export class TimetableAllLineStateQuery {
    readonly #store = inject(TimetableAllLineStateStore);

    readonly calendarId$ = this.#store.state.pipe(
        select((state) => state.calendarId),
    );
    readonly tripDirection$ = this.#store.state.pipe(
        select((state) => state.tripDirection),
    );
    readonly stations$ = this.#store.state.pipe(
        select((state) => ({
            tripDirection: state.tripDirection,
            stations: state.stations,
        })),
        map(({ tripDirection, stations }) => {
            return tripDirection === 0 ? [...stations].reverse() : stations;
        }),
    );
    readonly trips$ = this.#store.state.pipe(
        select((state) => ({
            tripDirection: state.tripDirection,
            stations: state.stations,
            tripBlocks: state.tripBlocks,
            pageSettings: state.pageSettings,
        })),
        map(({ tripDirection, stations, tripBlocks, pageSettings }) => {
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

            const filteredTrips = sortedTrips.filter((_, i) => {
                return (
                    pageSettings.pageIndex * pageSettings.pageSize <= i &&
                    i < (pageSettings.pageIndex + 1) * pageSettings.pageSize
                );
            });

            return filteredTrips;
        }),
    );
    readonly pageSettings$ = this.#store.state.pipe(
        select((state) => state.pageSettings),
    );

    get calendarId(): CalendarDetailsDto['calendarId'] {
        const { calendarId } = this.#store.state.getValue();
        return calendarId;
    }

    get tripDirection(): TripDetailsDto['tripDirection'] {
        const { tripDirection } = this.#store.state.getValue();
        return tripDirection;
    }

    get tripBlockId(): TripBlockDetailsDto['tripBlockId'] {
        const { tripBlockId } = this.#store.state.getValue();
        return tripBlockId;
    }
}

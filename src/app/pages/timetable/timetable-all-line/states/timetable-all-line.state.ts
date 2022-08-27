import { Injectable } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { guid, Query, Store } from '@datorama/akita';
import dayjs from 'dayjs';
import { cloneDeep } from 'lodash-es';
import { map } from 'rxjs/operators';
import { uniqueBy } from 'src/app/core/utils/unique-by';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

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
            }
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
        })
    );
    readonly trips$ = this.select([
        'tripDirection',
        'stations',
        'tripBlocks',
        'pageSettings',
    ]).pipe(
        map(({ tripDirection, stations, tripBlocks, pageSettings }) => {
            const sortedStations =
                tripDirection === 0 ? [...stations].reverse() : stations;

            const sortedTrips = uniqueBy(
                this._sortTrips(sortedStations, tripBlocks).reverse(),
                'tripBlockId'
            )
                .reverse()
                .map((o) => o.trips)
                .reduce((a, b) => [...a, ...b])
                .filter((_, i) => {
                    return (
                        pageSettings.pageIndex * pageSettings.pageSize <= i &&
                        i < (pageSettings.pageIndex + 1) * pageSettings.pageSize
                    );
                });

            return sortedTrips;
        })
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

    private _sortTrips(
        stations: StationDetailsDto[],
        tripBlocks: TripBlockDetailsDto[]
    ) {
        const unsorted: TripBlockDetailsDto[] = tripBlocks;
        const sorted: TripBlockDetailsDto[] = [];

        unsorted: for (const unsortedTripBlock of unsorted) {
            if (!sorted.length) {
                sorted.push(unsortedTripBlock);
                continue;
            }

            const unsortedTrips = cloneDeep(unsortedTripBlock.trips).reverse();
            unsortedTrip: for (const unsortedTrip of unsortedTrips) {
                sorted: for (let i = 0; i < sorted.length; i++) {
                    const latestTripBlock = sorted[sorted.length - (i + 1)];
                    const latestTrips = latestTripBlock.trips;

                    sortedTrip: for (const latestTrip of latestTrips) {
                        station: for (const station of stations) {
                            const sortTargetTime = unsortedTrip.times.find(
                                (time) => time.stationId === station.stationId
                            );

                            if (!sortTargetTime) {
                                continue;
                            }

                            const latestTripTime = latestTrip.times.find(
                                (time) => time.stationId === station.stationId
                            );

                            if (!latestTripTime) {
                                continue;
                            }

                            const format = 'HH:mm:dd';
                            const latestTripTimeArrivalTime = dayjs(
                                latestTripTime.arrivalTime,
                                format
                            ).add(latestTripTime.arrivalDays, 'days');
                            const sortTargetTripTimeArrivalTime = dayjs(
                                sortTargetTime.arrivalTime,
                                format
                            ).add(sortTargetTime.arrivalDays, 'days');
                            const latestTripTimeDepartureTime = dayjs(
                                latestTripTime.departureTime,
                                format
                            ).add(latestTripTime.departureDays, 'days');
                            const sortTargetTripTimeDepartureTime = dayjs(
                                sortTargetTime.departureTime,
                                format
                            ).add(sortTargetTime.departureDays, 'days');

                            if (
                                latestTripTimeArrivalTime >
                                sortTargetTripTimeArrivalTime
                            ) {
                                if (i === sorted.length - 1) {
                                    sorted.unshift(unsortedTripBlock);
                                    break sorted;
                                }

                                continue sorted;
                            }

                            if (
                                latestTripTimeArrivalTime <=
                                sortTargetTripTimeArrivalTime
                            ) {
                                sorted.splice(
                                    sorted.length - i,
                                    0,
                                    unsortedTripBlock
                                );

                                break sorted;
                            }

                            if (
                                latestTripTimeDepartureTime >
                                sortTargetTripTimeDepartureTime
                            ) {
                                if (i === sorted.length - 1) {
                                    sorted.unshift(unsortedTripBlock);
                                    break sorted;
                                }

                                continue sorted;
                            }

                            if (
                                latestTripTimeDepartureTime <=
                                sortTargetTripTimeDepartureTime
                            ) {
                                sorted.splice(
                                    sorted.length - i,
                                    0,
                                    unsortedTripBlock
                                );

                                break sorted;
                            }

                            if (
                                latestTripTimeArrivalTime >
                                    sortTargetTripTimeDepartureTime ||
                                latestTripTimeDepartureTime >
                                    sortTargetTripTimeArrivalTime
                            ) {
                                if (i === sorted.length - 1) {
                                    sorted.unshift(unsortedTripBlock);
                                    break sorted;
                                }

                                continue sorted;
                            }

                            if (
                                latestTripTimeArrivalTime <=
                                    sortTargetTripTimeDepartureTime ||
                                latestTripTimeDepartureTime <=
                                    sortTargetTripTimeArrivalTime
                            ) {
                                sorted.splice(
                                    sorted.length - i,
                                    0,
                                    unsortedTripBlock
                                );

                                break sorted;
                            }

                            continue;
                        }
                    }

                    if (i === sorted.length - 1) {
                        sorted.unshift(unsortedTripBlock);
                        break sorted;
                    }
                }
            }
        }

        return sorted;
    }
}

import { add, parse } from 'date-fns';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';

export function sortTrips(
    stations: StationDetailsDto[],
    tripBlocks: TripBlockDetailsDto[],
) {
    const unsorted: TripBlockDetailsDto[] = tripBlocks;
    const sorted: TripBlockDetailsDto[] = [];

    unsorted: for (const unsortedTripBlock of unsorted) {
        if (!sorted.length) {
            sorted.push(unsortedTripBlock);
            continue;
        }

        const unsortedTrips = [...unsortedTripBlock.trips].reverse();

        unsortedTrip: for (const unsortedTrip of unsortedTrips) {
            sorted: for (let i = sorted.length - 1; i >= 0; i--) {
                const latestTripBlock = sorted[i];
                const latestTrips = latestTripBlock.trips;

                sortedTrip: for (const latestTrip of latestTrips) {
                    station: for (const station of stations) {
                        const sortTargetTime = unsortedTrip.times.find(
                            (time) => time.stationId === station.stationId,
                        );

                        if (!sortTargetTime) {
                            continue;
                        }

                        const latestTripTime = latestTrip.times.find(
                            (time) => time.stationId === station.stationId,
                        );

                        if (!latestTripTime) {
                            continue;
                        }

                        const format = 'HH:mm:ss';
                        const timeParseFn = (time: string, days: number) =>
                            add(parse(time, format, new Date()), {
                                days,
                            });

                        const latestTripTimeArrivalTime = timeParseFn(
                            latestTripTime.arrivalTime ?? '',
                            latestTripTime.arrivalDays ?? 0,
                        );
                        const sortTargetTripTimeArrivalTime = timeParseFn(
                            sortTargetTime.arrivalTime ?? '',
                            sortTargetTime.arrivalDays ?? 0,
                        );
                        const latestTripTimeDepartureTime = timeParseFn(
                            latestTripTime.departureTime ?? '',
                            latestTripTime.departureDays ?? 0,
                        );
                        const sortTargetTripTimeDepartureTime = timeParseFn(
                            sortTargetTime.departureTime ?? '',
                            sortTargetTime.departureDays ?? 0,
                        );

                        if (
                            latestTripTimeArrivalTime >
                            sortTargetTripTimeArrivalTime
                        ) {
                            if (i === 0) {
                                sorted.unshift(unsortedTripBlock);
                                break sorted;
                            }

                            continue sorted;
                        }

                        if (
                            latestTripTimeArrivalTime <=
                            sortTargetTripTimeArrivalTime
                        ) {
                            sorted.splice(i + 1, 0, unsortedTripBlock);
                            break sorted;
                        }

                        if (
                            latestTripTimeDepartureTime >
                            sortTargetTripTimeDepartureTime
                        ) {
                            if (i === 0) {
                                sorted.unshift(unsortedTripBlock);
                                break sorted;
                            }

                            continue sorted;
                        }

                        if (
                            latestTripTimeDepartureTime <=
                            sortTargetTripTimeDepartureTime
                        ) {
                            sorted.splice(i + 1, 0, unsortedTripBlock);
                            break sorted;
                        }

                        if (
                            latestTripTimeArrivalTime >
                                sortTargetTripTimeDepartureTime ||
                            latestTripTimeDepartureTime >
                                sortTargetTripTimeArrivalTime
                        ) {
                            if (i === 0) {
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
                            sorted.splice(i + 1, 0, unsortedTripBlock);
                            break sorted;
                        }

                        continue;
                    }
                }

                if (i === 0) {
                    sorted.unshift(unsortedTripBlock);
                    break sorted;
                }
            }
        }
    }

    return sorted;
}

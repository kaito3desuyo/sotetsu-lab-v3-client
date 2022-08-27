import { Pipe, PipeTransform } from '@angular/core';
import dayjs from 'dayjs';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { ETimetableStationViewMode } from '../../general/interfaces/timetable-station';

@Pipe({
    name: 'timetableAllLineGetTime',
})
export class TimetableAllLineGetTimePipe implements PipeTransform {
    private readonly _staitonViewMode: typeof ETimetableStationViewMode =
        ETimetableStationViewMode;

    transform(
        {
            station,
            trip,
        }: {
            station: StationDetailsDto & {
                viewMode?: ETimetableStationViewMode;
                borderSetting?: boolean;
            };
            trip: TripDetailsDto;
        },
        {
            mode,
            stations,
            trips,
        }: {
            mode: 'arrival' | 'departure';
            stations: (StationDetailsDto & {
                viewMode?: ETimetableStationViewMode;
                borderSetting?: boolean;
            })[];
            trips: TripDetailsDto[];
        }
    ): string {
        return this._getTime({ station, trip }, { mode, stations, trips });
    }

    private _getTime(
        {
            station,
            trip,
        }: {
            station: StationDetailsDto & {
                viewMode?: ETimetableStationViewMode;
                borderSetting?: boolean;
            };
            trip: TripDetailsDto;
        },
        {
            mode,
            stations,
            trips,
        }: {
            mode: 'arrival' | 'departure';
            stations: (StationDetailsDto & {
                viewMode?: ETimetableStationViewMode;
                borderSetting?: boolean;
            })[];
            trips: TripDetailsDto[];
        }
    ): string {
        const time = trip.times.find((o) => {
            return o.stationId === station.stationId;
        });
        const stationIndex = stations.findIndex(
            (o) => o.stationId === station.stationId
        );
        const tripIndex = trips.findIndex((o) => o.tripId === trip.tripId);

        if (time) {
            switch (true) {
                case mode === 'arrival' &&
                    station.viewMode ===
                        this._staitonViewMode.DEPARTURE_AND_ARRIVAL:
                    if (
                        time.pickupType === 1 &&
                        time.dropoffType === 1 &&
                        !time.arrivalTime
                    ) {
                        return '↓';
                    }

                    const minus1Trip = trips[tripIndex - 1];
                    // const plus1Time = trip.times.find((o) => {
                    //     return (
                    //         o.stationId === stations[stationIndex + 1].stationId
                    //     );
                    // });
                    if (
                        minus1Trip &&
                        minus1Trip.tripBlockId === trip.tripBlockId &&
                        // plus1Time &&
                        minus1Trip.times.some(
                            (o) => o.stationId === station.stationId
                        )
                    ) {
                        return '⬎';
                    }

                    if (time.departureTime && !time.arrivalTime) {
                        return '‥';
                    }

                    return this._formatTime(time.arrivalTime);
                case mode === 'arrival':
                    if (
                        time.pickupType === 1 &&
                        time.dropoffType === 1 &&
                        !time.arrivalTime
                    ) {
                        return '↓';
                    }
                    return this._formatTime(time.arrivalTime);
                case mode === 'departure' &&
                    station.viewMode === this._staitonViewMode.ONLY_DEPARTURE:
                    if (
                        time.pickupType === 1 &&
                        time.dropoffType === 1 &&
                        !time.departureTime
                    ) {
                        return '↓';
                    }

                    if (!time.departureTime) {
                        return this._formatTime(time.arrivalTime);
                    }

                    return this._formatTime(time.departureTime);
                case mode === 'departure' &&
                    station.viewMode ===
                        this._staitonViewMode.DEPARTURE_AND_ARRIVAL:
                    if (
                        time.pickupType === 1 &&
                        time.dropoffType === 1 &&
                        !time.departureTime
                    ) {
                        return '↓';
                    }

                    if (time.arrivalTime && !time.departureTime) {
                        return '‥';
                    }

                    return this._formatTime(time.departureTime);
                case mode === 'departure':
                    if (
                        time.pickupType === 1 &&
                        time.dropoffType === 1 &&
                        !time.departureTime
                    ) {
                        return '↓';
                    }
                    return this._formatTime(time.departureTime);
            }
        } else {
            let isExistTimeBeforeStation = false;
            let isExistTimeAfterStation = false;
            for (let i = 0; i < stationIndex; i++) {
                const stationId = stations[i].stationId;
                if (trip.times.some((o) => o.stationId === stationId)) {
                    isExistTimeBeforeStation = true;
                    break;
                }
            }
            for (let i = stationIndex + 1; i <= stations.length - 1; i++) {
                const stationId = stations[i].stationId;
                if (trip.times.some((o) => o.stationId === stationId)) {
                    isExistTimeAfterStation = true;
                    break;
                }
            }

            if (isExistTimeBeforeStation && isExistTimeAfterStation) {
                return '|';
            }

            const minus1Station = stations[stationIndex - 1];
            if (minus1Station) {
                const minus1Time = trip.times.find((o) => {
                    return o.stationId === minus1Station.stationId;
                });

                if (
                    minus1Time &&
                    minus1Station.borderSetting === false &&
                    minus1Station.viewMode !==
                        this._staitonViewMode.DEPARTURE_AND_ARRIVAL &&
                    !(
                        mode === 'departure' &&
                        station.viewMode ===
                            this._staitonViewMode.DEPARTURE_AND_ARRIVAL
                    )
                ) {
                    return '=';
                }
            }

            const plus1Station = stations[stationIndex + 1];
            if (plus1Station) {
                const minus1Trip = trips[tripIndex - 1];
                const plus1Time = trip.times.find((o) => {
                    return o.stationId === plus1Station.stationId;
                });

                if (
                    minus1Trip &&
                    minus1Trip.tripBlockId === trip.tripBlockId &&
                    minus1Trip.times.some(
                        (o) => o.stationId === plus1Station.stationId
                    ) &&
                    plus1Station.viewMode !==
                        this._staitonViewMode.DEPARTURE_AND_ARRIVAL &&
                    plus1Time &&
                    !(
                        mode === 'arrival' &&
                        station.viewMode ===
                            this._staitonViewMode.DEPARTURE_AND_ARRIVAL
                    )
                ) {
                    return '⬎';
                }
            }

            return '‥';
        }
    }

    private _formatTime(timeString: string) {
        let time = dayjs(timeString, 'HH:mm:ss').format('Hmm');
        if (time.length === 3) {
            time = '-' + time;
        }
        return timeString ? time : '';
    }
}

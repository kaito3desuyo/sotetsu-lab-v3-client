import { format, parse } from 'date-fns';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { ETimetableAllLineStationViewMode } from '../enums/timetable-all-line.enum';
import { getBorderSetting } from './get-border-setting.util';
import { getViewMode } from './get-view-mode.util';

function _formatTime(timeString: string): string {
    const date = parse(timeString, 'HH:mm:ss', new Date());
    let time = format(date, 'Hmm');
    if (time.length === 3) {
        time = '-' + time;
    }
    return timeString ? time : '';
}

export function getTime({
    tripDirection,
    mode,
    station,
    trip,
    stations,
    trips,
}: {
    tripDirection: 0 | 1;
    mode: 'arrival' | 'departure';
    station: StationDetailsDto;
    trip: TripDetailsDto;
    stations: StationDetailsDto[];
    trips: TripDetailsDto[];
}): string {
    const time = trip.times.find((o) => {
        return o.stationId === station.stationId;
    });
    const stationIndex = stations.findIndex(
        (o) => o.stationId === station.stationId,
    );
    const tripIndex = trips.findIndex((o) => o.tripId === trip.tripId);
    const viewMode = getViewMode(station, tripDirection);

    if (time) {
        switch (true) {
            case mode === 'arrival' &&
                viewMode ===
                    ETimetableAllLineStationViewMode.DEPARTURE_AND_ARRIVAL:
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
                        (o) => o.stationId === station.stationId,
                    )
                ) {
                    return '⬎';
                }

                if (time.departureTime && !time.arrivalTime) {
                    return '‥';
                }

                return _formatTime(time.arrivalTime);
            case mode === 'arrival':
                if (
                    time.pickupType === 1 &&
                    time.dropoffType === 1 &&
                    !time.arrivalTime
                ) {
                    return '↓';
                }
                return _formatTime(time.arrivalTime);
            case mode === 'departure' &&
                viewMode === ETimetableAllLineStationViewMode.ONLY_DEPARTURE:
                if (
                    time.pickupType === 1 &&
                    time.dropoffType === 1 &&
                    !time.departureTime
                ) {
                    return '↓';
                }

                if (!time.departureTime) {
                    return _formatTime(time.arrivalTime);
                }

                return _formatTime(time.departureTime);
            case mode === 'departure' &&
                viewMode ===
                    ETimetableAllLineStationViewMode.DEPARTURE_AND_ARRIVAL:
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

                return _formatTime(time.departureTime);
            case mode === 'departure':
                if (
                    time.pickupType === 1 &&
                    time.dropoffType === 1 &&
                    !time.departureTime
                ) {
                    return '↓';
                }
                return _formatTime(time.departureTime);
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
            const minus1StationViewMode = getViewMode(
                minus1Station,
                tripDirection,
            );
            const minus1BorderSetting = getBorderSetting(
                minus1Station,
                tripDirection,
            );
            const minus1Time = trip.times.find((o) => {
                return o.stationId === minus1Station.stationId;
            });

            if (
                minus1Time &&
                minus1BorderSetting === false &&
                minus1StationViewMode !==
                    ETimetableAllLineStationViewMode.DEPARTURE_AND_ARRIVAL &&
                !(
                    mode === 'departure' &&
                    viewMode ===
                        ETimetableAllLineStationViewMode.DEPARTURE_AND_ARRIVAL
                )
            ) {
                return '=';
            }
        }

        const plus1Station = stations[stationIndex + 1];

        if (plus1Station) {
            const minus1Trip = trips[tripIndex - 1];
            const plus1StationViewMode = getViewMode(
                plus1Station,
                tripDirection,
            );
            const plus1Time = trip.times.find((o) => {
                return o.stationId === plus1Station.stationId;
            });

            if (
                minus1Trip &&
                minus1Trip.tripBlockId === trip.tripBlockId &&
                minus1Trip.times.some(
                    (o) => o.stationId === plus1Station.stationId,
                ) &&
                plus1StationViewMode !==
                    ETimetableAllLineStationViewMode.DEPARTURE_AND_ARRIVAL &&
                plus1Time &&
                !(
                    mode === 'arrival' &&
                    viewMode ===
                        ETimetableAllLineStationViewMode.DEPARTURE_AND_ARRIVAL
                )
            ) {
                return '⬎';
            }
        }

        return '‥';
    }
}

import dayjs from 'dayjs';
import { areArrayValuesEqual } from 'src/app/core/utils/are-array-values-equal';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { ETimetableAllLineStationViewMode } from '../interfaces/timetable-all-line.interface';

function sortTrips(
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

                        const format = 'HH:mm:dd';
                        const latestTripTimeArrivalTime = dayjs(
                            latestTripTime.arrivalTime,
                            format,
                        ).add(latestTripTime.arrivalDays, 'days');
                        const sortTargetTripTimeArrivalTime = dayjs(
                            sortTargetTime.arrivalTime,
                            format,
                        ).add(sortTargetTime.arrivalDays, 'days');
                        const latestTripTimeDepartureTime = dayjs(
                            latestTripTime.departureTime,
                            format,
                        ).add(latestTripTime.departureDays, 'days');
                        const sortTargetTripTimeDepartureTime = dayjs(
                            sortTargetTime.departureTime,
                            format,
                        ).add(sortTargetTime.departureDays, 'days');

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

function _formatTime(timeString: string): string {
    let time = dayjs(timeString, 'HH:mm:ss').format('Hmm');
    if (time.length === 3) {
        time = '-' + time;
    }
    return timeString ? time : '';
}

function getTime({
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

function getViewMode(
    station: StationDetailsDto,
    tripDirection: 0 | 1,
): ETimetableAllLineStationViewMode {
    if (tripDirection === 0) {
        const departureAndArrival = [
            { routeName: ['川越線', '埼京線'], stationName: '大宮' },
            { routeName: ['埼京線'], stationName: '新宿' },
            {
                routeName: ['埼京線', '相鉄・JR直通線', 'りんかい線'],
                stationName: '大崎',
            },
            {
                routeName: ['三田線', '南北線', '目黒線'],
                stationName: '目黒',
            },
            {
                routeName: ['東上本線'],
                stationName: '川越市',
            },
            {
                routeName: ['東上本線', '副都心線', '有楽町線'],
                stationName: '和光市',
            },
            {
                routeName: ['池袋線'],
                stationName: '飯能',
            },
            {
                routeName: ['池袋線'],
                stationName: '所沢',
            },
            {
                routeName: ['池袋線', '西武有楽町線'],
                stationName: '練馬',
            },
            {
                routeName: ['副都心線', '有楽町線', '西武有楽町線'],
                stationName: '小竹向原',
            },
            {
                routeName: ['副都心線'],
                stationName: '新宿三丁目',
            },
            { routeName: ['副都心線', '東横線'], stationName: '渋谷' },
            {
                routeName: ['東横線', '目黒線', '東急新横浜線'],
                stationName: '日吉',
            },
            {
                routeName: ['東横線', 'みなとみらい線'],
                stationName: '横浜',
            },
            {
                routeName: ['本線', '新横浜線'],
                //  routeName: ['本線', '相鉄新横浜線'],
                stationName: '西谷',
            },
            { routeName: ['本線', 'いずみ野線'], stationName: '二俣川' },
            { routeName: ['いずみ野線'], stationName: 'いずみ野' },
            { routeName: ['本線'], stationName: '大和' },
        ];

        if (
            departureAndArrival.some(
                (o) =>
                    station.stationName === o.stationName &&
                    areArrayValuesEqual(
                        station.routeStationLists.map(
                            (rsl) => rsl.route.routeName,
                        ),
                        o.routeName,
                    ),
            )
        ) {
            return ETimetableAllLineStationViewMode.DEPARTURE_AND_ARRIVAL;
        }

        const onlyInboundArrival = [
            { routeName: ['川越線'], stationName: '川越' },
            { routeName: ['三田線'], stationName: '西高島平' },
            { routeName: ['埼玉高速鉄道線'], stationName: '浦和美園' },
            { routeName: ['秩父線'], stationName: '西武秩父' },
            { routeName: ['東上本線'], stationName: '小川町' },
            { routeName: ['本線'], stationName: '横浜' },
        ];

        if (
            onlyInboundArrival.some(
                (o) =>
                    station.stationName === o.stationName &&
                    areArrayValuesEqual(
                        station.routeStationLists.map(
                            (rsl) => rsl.route.routeName,
                        ),
                        o.routeName,
                    ),
            )
        ) {
            return ETimetableAllLineStationViewMode.ONLY_INBOUND_ARRIVAL;
        }

        return ETimetableAllLineStationViewMode.ONLY_DEPARTURE;
    } else if (tripDirection === 1) {
        const departureAndArrival = [
            { routeName: ['川越線', '埼京線'], stationName: '大宮' },
            { routeName: ['埼京線'], stationName: '新宿' },
            {
                routeName: ['埼京線', '相鉄・JR直通線', 'りんかい線'],
                stationName: '大崎',
            },
            {
                routeName: ['三田線', '南北線', '目黒線'],
                stationName: '目黒',
            },
            {
                routeName: ['東上本線'],
                stationName: '川越市',
            },
            {
                routeName: ['東上本線', '副都心線', '有楽町線'],
                stationName: '和光市',
            },
            {
                routeName: ['池袋線'],
                stationName: '飯能',
            },
            {
                routeName: ['池袋線'],
                stationName: '所沢',
            },
            {
                routeName: ['池袋線', '西武有楽町線'],
                stationName: '練馬',
            },
            {
                routeName: ['副都心線', '有楽町線', '西武有楽町線'],
                stationName: '小竹向原',
            },
            {
                routeName: ['副都心線'],
                stationName: '新宿三丁目',
            },
            { routeName: ['副都心線', '東横線'], stationName: '渋谷' },
            {
                routeName: ['東横線', '目黒線', '東急新横浜線'],
                stationName: '日吉',
            },
            {
                routeName: ['東横線', 'みなとみらい線'],
                stationName: '横浜',
            },
            {
                routeName: ['本線', '新横浜線'],
                // routeName: ['本線', '相鉄新横浜線'],
                stationName: '西谷',
            },
            { routeName: ['本線', 'いずみ野線'], stationName: '二俣川' },
            { routeName: ['いずみ野線'], stationName: 'いずみ野' },
            { routeName: ['本線'], stationName: '大和' },
        ];

        if (
            departureAndArrival.some(
                (o) =>
                    station.stationName === o.stationName &&
                    areArrayValuesEqual(
                        station.routeStationLists.map(
                            (rsl) => rsl.route.routeName,
                        ),
                        o.routeName,
                    ),
            )
        ) {
            return ETimetableAllLineStationViewMode.DEPARTURE_AND_ARRIVAL;
        }

        const onlyOutboundArrival = [
            { routeName: ['りんかい線'], stationName: '新木場' },
            { routeName: ['池袋線'], stationName: '池袋' },
            { routeName: ['東上本線'], stationName: '池袋' },
            { routeName: ['有楽町線'], stationName: '新木場' },
            { routeName: ['みなとみらい線'], stationName: '元町・中華街' },
            { routeName: ['いずみ野線'], stationName: '湘南台' },
            { routeName: ['本線'], stationName: '海老名' },
            { routeName: ['厚木線'], stationName: '厚木' },
        ];

        if (
            onlyOutboundArrival.some(
                (o) =>
                    station.stationName === o.stationName &&
                    areArrayValuesEqual(
                        station.routeStationLists.map(
                            (rsl) => rsl.route.routeName,
                        ),
                        o.routeName,
                    ),
            )
        ) {
            return ETimetableAllLineStationViewMode.ONLY_OUTBOUND_ARRIVAL;
        }

        return ETimetableAllLineStationViewMode.ONLY_DEPARTURE;
    } else {
        return null;
    }
}

function getBorderSetting(
    station: StationDetailsDto,
    tripDirection: 0 | 1,
): boolean {
    if (tripDirection === 0) {
        const target = [
            { routeName: ['りんかい線'], stationName: '大井町' },
            { routeName: ['三田線'], stationName: '西高島平' },
            { routeName: ['埼玉高速鉄道線'], stationName: '浦和美園' },
            { routeName: ['東上本線'], stationName: '小川町' },
            { routeName: ['秩父線'], stationName: '西武秩父' },
            { routeName: ['西武有楽町線'], stationName: '新桜台' },
            { routeName: ['有楽町線', '副都心線'], stationName: '地下鉄成増' },
            { routeName: ['東横線'], stationName: '綱島' },
            { routeName: ['本線'], stationName: '横浜' },
            { routeName: ['本線'], stationName: '希望ヶ丘' },
            { routeName: ['厚木線'], stationName: '厚木' },
        ];

        if (
            target.some(
                (o) =>
                    station.stationName === o.stationName &&
                    areArrayValuesEqual(
                        station.routeStationLists.map(
                            (rsl) => rsl.route.routeName,
                        ),
                        o.routeName,
                    ),
            )
        ) {
            return true;
        }

        return false;
    } else if (tripDirection === 1) {
        const target = [
            { routeName: ['相鉄・JR直通線'], stationName: '武蔵小杉' },
            { routeName: ['りんかい線'], stationName: '新木場' },
            { routeName: ['三田線'], stationName: '三田' },
            { routeName: ['目黒線'], stationName: '奥沢' },
            { routeName: ['東上本線'], stationName: '池袋' },
            { routeName: ['池袋線'], stationName: '池袋' },
            { routeName: ['西武有楽町線'], stationName: '新桜台' },
            { routeName: ['有楽町線'], stationName: '新木場' },
            {
                routeName: ['新横浜線', '相鉄・JR直通線'],
                // routeName: ['相鉄新横浜線', '相鉄・JR直通線'],
                stationName: '羽沢横浜国大',
            },
            {
                routeName: ['みなとみらい線'],
                stationName: '元町・中華街',
            },
            { routeName: ['いずみ野線'], stationName: '湘南台' },
            { routeName: ['本線'], stationName: '海老名' },
        ];

        if (
            target.some(
                (o) =>
                    station.stationName === o.stationName &&
                    areArrayValuesEqual(
                        station.routeStationLists.map(
                            (rsl) => rsl.route.routeName,
                        ),
                        o.routeName,
                    ),
            )
        ) {
            return true;
        }

        return false;
    } else {
        return false;
    }
}

export const TimetableAllLineUtil = {
    sortTrips,
    getTime,
    getViewMode,
    getBorderSetting,
} as const;

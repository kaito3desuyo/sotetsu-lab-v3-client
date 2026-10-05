import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { ETimetableAllLineStationViewMode } from '../enums/timetable-all-line.enum';
import { formatDiaTime } from './format-dia-time.util';
import { hiddenStopsAround } from './trip-endpoints.util';

export function getTime({
    tripDirection,
    mode,
    station,
    trip,
    stations,
    previousTrip,
    viewModes,
    bordersAfter,
}: {
    tripDirection: 0 | 1;
    mode: 'arrival' | 'departure';
    station: StationDetailsDto;
    trip: TripDetailsDto;
    stations: StationDetailsDto[];
    /** 列の並びで 1 つ前の列車。ページ分けの前の並びから引く（前のページにあっても同じ運行の印を出すため） */
    previousTrip?: TripDetailsDto;
    viewModes: ReadonlyMap<string, ETimetableAllLineStationViewMode>;
    bordersAfter: ReadonlyMap<string, boolean>;
}): string {
    const time = trip.times.find((o) => {
        return o.stationId === station.stationId;
    });
    const stationIndex = stations.findIndex(
        (o) => o.stationId === station.stationId,
    );
    const viewMode = viewModes.get(station.stationId);

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

                const minus1Trip = previousTrip;
                if (
                    minus1Trip &&
                    minus1Trip.tripBlockId === trip.tripBlockId &&
                    minus1Trip.times.some(
                        (o) => o.stationId === station.stationId,
                    )
                ) {
                    return '⬎';
                }

                if (time.departureTime && !time.arrivalTime) {
                    return '‥';
                }

                return formatDiaTime(time.arrivalTime);
            case mode === 'arrival':
                if (
                    time.pickupType === 1 &&
                    time.dropoffType === 1 &&
                    !time.arrivalTime
                ) {
                    return '↓';
                }
                return formatDiaTime(time.arrivalTime);
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
                    return formatDiaTime(time.arrivalTime);
                }

                return formatDiaTime(time.departureTime);
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

                return formatDiaTime(time.departureTime);
            case mode === 'departure':
                if (
                    time.pickupType === 1 &&
                    time.dropoffType === 1 &&
                    !time.departureTime
                ) {
                    return '↓';
                }
                return formatDiaTime(time.departureTime);
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

        // 路線の絞り込みで始発駅・終着駅が隠れた列車は、表の上端・下端まで「経由なし」を
        // 伸ばし、表の外から来て表の外へ出ることを示す（ユーザー指示 2026-09-24）。
        // 終着の区切り「=」は出さない（列車は隠れた駅へ続いている）
        const hidden = hiddenStopsAround(trip, viewModes);
        if (
            (!isExistTimeBeforeStation &&
                isExistTimeAfterStation &&
                hidden.before) ||
            (isExistTimeBeforeStation &&
                !isExistTimeAfterStation &&
                hidden.after)
        ) {
            return '|';
        }

        const minus1Station = stations[stationIndex - 1];

        if (minus1Station) {
            const minus1StationViewMode = viewModes.get(
                minus1Station.stationId,
            );
            const minus1BorderSetting =
                bordersAfter.get(minus1Station.stationId) ?? false;
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
            const minus1Trip = previousTrip;
            const plus1StationViewMode = viewModes.get(plus1Station.stationId);
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

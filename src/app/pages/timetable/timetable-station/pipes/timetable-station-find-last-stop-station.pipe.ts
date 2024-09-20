import { Pipe, PipeTransform } from '@angular/core';
import dayjs from 'dayjs';
import { maxBy, minBy } from 'lodash-es';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

@Pipe({
    standalone: true,
    name: 'timetableStationFindLastStopStation',
})
export class TimetableStationFindLastStopStationPipe implements PipeTransform {
    transform(trip: TripDetailsDto): StationDetailsDto['stationId'] {
        const searchingTrip = trip.tripBlock.trips.find(
            (o) => o.tripId === trip.tripId,
        );

        const searchingTripFinalStopTime = maxBy(
            searchingTrip.times,
            (o) => o.stopSequence,
        );

        // 検索対象のtripの後に継続して運行されるtripを探す
        const afterTrips = trip.tripBlock.trips.filter((o) => {
            // 走査中のtripの最初のtime
            const firstTripTimeInTripBlock = minBy(
                o.times,
                (o) => o.stopSequence,
            );

            return (
                o.tripId !== trip.tripId &&
                dayjs(firstTripTimeInTripBlock.departureTime, 'HH:mm:ss')
                    .add(firstTripTimeInTripBlock.departureDays - 1, 'days')
                    .isSameOrAfter(
                        dayjs(
                            searchingTripFinalStopTime.arrivalTime,
                            'HH:mm:ss',
                        ).add(
                            searchingTripFinalStopTime.arrivalDays - 1,
                            'days',
                        ),
                    )
            );
        });

        // 検索対象のtripの後に継続して運行されるtripがない場合は、検索対象のtripの最終停車駅IDを返す
        if (!afterTrips.length) {
            return searchingTripFinalStopTime.stationId;
        }

        // 検索対象のtripの後に継続して運行されるtripが1つある場合は、そのtripの最終停車駅IDを返す
        if (afterTrips.length === 1) {
            const afterTripsFinalStopTime = maxBy(
                afterTrips[0].times,
                (o) => o.stopSequence,
            );

            return afterTripsFinalStopTime.stationId;
        }

        // 検索対象のtripの後に継続して運行されるtripが複数ある場合は、一番最後に運行されるtripの最終停車駅IDを返す
        const afterTripsFinalStopTime = maxBy(
            afterTrips.map((o) => maxBy(o.times, (o2) => o2.stopSequence)),
            (o) =>
                dayjs(o.arrivalTime, 'HH:mm:ss')
                    .add(o.arrivalDays - 1, 'days')
                    .unix(),
        );

        return afterTripsFinalStopTime.stationId;
    }
}

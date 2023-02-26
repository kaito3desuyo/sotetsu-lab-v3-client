import { Pipe, PipeTransform } from '@angular/core';
import has from 'just-has';
import get from 'just-safe-get';
import set from 'just-safe-set';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { TimetableAllLineUtil } from '../utils/timetable-all-line.util';

@Pipe({
    name: 'timetableAllLineGetTime',
})
export class TimetableAllLineGetTimePipe implements PipeTransform {
    transform({
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
        return TimetableAllLineUtil.getTime({
            tripDirection,
            mode,
            station,
            trip,
            stations,
            trips,
        });
    }
}

interface TrackByFunctionCache {
    [propertyName: string]: <T>(index: number, item: T) => any;
}

const cache: TrackByFunctionCache = Object.create(null);

@Pipe({
    name: 'timetableAllLineGetTimeAndTrackBy',
})
export class TimetableAllLineGetTimeAndTrackByPipe implements PipeTransform {
    transform({
        tripDirection,
        mode,
        station,
        stations,
        trip,
        trips,
    }: {
        mode: 'arrival' | 'departure';
        station: StationDetailsDto;
        stations: StationDetailsDto[];
        trip: TripDetailsDto;
        trips: TripDetailsDto[];
        tripDirection: 0 | 1;
    }): (index: number, trip: TripDetailsDto) => string {
        const propertyName = `${tripDirection}-${mode}-${station.stationId}-${trip?.tripId}`;

        if (!has(cache, propertyName)) {
            set(cache, propertyName, function trackByProperty<
                T
            >(index: number, item: TripDetailsDto): any {
                return TimetableAllLineUtil.getTime({
                    tripDirection,
                    mode,
                    station,
                    trip: item,
                    stations,
                    trips,
                });
            });
        }

        return get(cache, propertyName);
    }
}

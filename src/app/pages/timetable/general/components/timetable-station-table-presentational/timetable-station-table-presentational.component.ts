import {
    Component,
    ChangeDetectionStrategy,
    Input,
    OnChanges,
    SimpleChanges
} from '@angular/core';
import { ITime } from 'src/app/general/interfaces/time';
import groupBy from 'lodash/groupBy';
import map from 'lodash/map';
import concat from 'lodash/concat';
import moment from 'moment';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import find from 'lodash/find';
import sortBy from 'lodash/sortBy';
import { ITrip } from 'src/app/general/interfaces/trip';
import { IStation } from 'src/app/general/interfaces/station';

@Component({
    selector: 'app-timetable-station-table-presentational',
    templateUrl: './timetable-station-table-presentational.component.html',
    styleUrls: ['./timetable-station-table-presentational.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimetableStationTablePresentationalComponent implements OnChanges {
    data: ITimetableStationTable[] = [];
    maxColumnsCount = 0;

    @Input() calendarId: string;
    @Input() times: ITime[];
    @Input() sightings: IOperationSighting[];
    @Input() stations: IStation[];

    constructor() {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.times || changes.sightings) {
            const groupedByDay = groupBy(this.times as ITime[], o =>
                o.departureDays
                    ? o.departureDays
                    : o.arrivalDays
                    ? o.arrivalDays
                    : null
            );
            const mapped = map(groupedByDay, o => {
                const groupedByTime = groupBy(o, time => {
                    const target = time.departureTime
                        ? time.departureTime
                        : time.arrivalTime
                        ? time.arrivalTime
                        : null;

                    if (target) {
                        return moment(
                            time.departureTime
                                ? time.departureTime
                                : time.arrivalTime
                                ? time.arrivalTime
                                : null,
                            'HH:mm:ss'
                        ).format('H');
                    } else {
                        return '？';
                    }
                });
                const mappedByTime = map(groupedByTime, (times, key) => {
                    return {
                        hour: key,
                        times: times.map(time => ({
                            mode: time.departureTime
                                ? 'departure'
                                : time.arrivalTime
                                ? 'arrival'
                                : null,
                            minute: time.departureTime
                                ? moment(time.departureTime, 'HH:mm:ss').format(
                                      'mm'
                                  )
                                : time.arrivalTime
                                ? moment(time.arrivalTime, 'HH:mm:ss').format(
                                      'mm'
                                  )
                                : null,
                            tripDirection: time.trip.tripDirection,
                            tripBlockId: time.trip.tripBlockId,
                            tripClassName: time.trip.tripClass.tripClassName,
                            tripClassColor: time.trip.tripClass.tripClassColor,
                            lastStop: time.trip.times.length
                                ? time.trip.times[time.trip.times.length - 1]
                                      .stationId
                                : null,

                            /*time.trip.tripOperationLists[0]
                ? time.trip.tripOperationLists[0].endStation.stationName
                : null,*/

                            sameTripBlockTrips: time.trip.tripBlock.trips.filter(
                                trip => trip.id !== time.trip.id
                            ),
                            operationSightings: time.trip.tripOperationLists.map(
                                tripOperationList => {
                                    const operationSighting = find(
                                        this.sightings as IOperationSighting[],
                                        v =>
                                            v.circulatedOperationId ===
                                            tripOperationList.operationId
                                    );
                                    if (
                                        operationSighting &&
                                        operationSighting.formation
                                    ) {
                                        return {
                                            operationNumber:
                                                tripOperationList.operation
                                                    .operationNumber,
                                            formationNumber:
                                                operationSighting.formation
                                                    .formationNumber,
                                            sightingTime:
                                                operationSighting.sightingTime
                                        };
                                    } else {
                                        return {
                                            operationNumber:
                                                tripOperationList.operation
                                                    .operationNumber,
                                            formationNumber: null,
                                            sightingTime: operationSighting
                                                ? operationSighting.sightingTime
                                                : null
                                        };
                                    }
                                }
                            )
                        }))
                    };
                });
                return mappedByTime;
            });

            const sorted = concat([], ...mapped).map(row => ({
                ...row,
                times: sortBy(row.times, o => o.minute)
            }));

            this.data = sorted;
            this.maxColumnsCount = 0;
            this.data.forEach(col => {
                if (this.maxColumnsCount < col.times.length) {
                    this.maxColumnsCount = col.times.length;
                }
            });
        }
    }

    calcDiffSightingTimeToCurrentTime(dateString: string): number {
        const date = moment(dateString).subtract(
            moment(dateString).hour() < 4 ? 1 : 0,
            'days'
        );
        const now = moment().subtract(moment().hour() < 4 ? 1 : 0, 'days');
        return now.date() - date.date();
    }
}

interface ITimetableStationTable {
    hour: string;
    times: {
        mode: string; // 'departure' | 'arrival';
        minute: string;
        lastStop: string;
        sameTripBlockTrips: ITrip[];
        operationSightings: {
            operationNumber: string;
            formationNumber: string;
            sightingTime: string;
        }[];
    }[];
}

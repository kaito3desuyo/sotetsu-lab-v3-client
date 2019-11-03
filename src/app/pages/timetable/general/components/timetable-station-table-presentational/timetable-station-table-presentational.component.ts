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
import join from 'lodash/join';
import moment from 'moment';
import { IOperation } from 'src/app/general/interfaces/operation';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import find from 'lodash/find';
import sortBy from 'lodash/sortBy';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { ITrip } from 'src/app/general/interfaces/trip';

@Component({
  selector: 'app-timetable-station-table-presentational',
  templateUrl: './timetable-station-table-presentational.component.html',
  styleUrls: ['./timetable-station-table-presentational.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimetableStationTablePresentationalComponent implements OnChanges {
  data: ITimetableStationTable[] = [];
  maxColumnsCount = 0;

  @Input() times: ITime[];
  @Input() sightings: IOperationSighting[];
  @Input() stationId: string;

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.times || changes.sightings) {
      console.log('times', changes.times.currentValue);
      console.log('sightings', changes.sightings.currentValue);

      const groupedByDay = groupBy(changes.times.currentValue as ITime[], o =>
        o.departureDays ? o.departureDays : o.arrivalDays ? o.arrivalDays : null
      );
      const mapped = map(groupedByDay, o => {
        const groupedByTime = groupBy(o, time =>
          moment(
            time.departureTime
              ? time.departureTime
              : time.arrivalTime
              ? time.arrivalTime
              : null,
            'HH:mm:ss'
          ).format('H')
        );
        console.log(groupedByTime);
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
                ? moment(time.departureTime, 'HH:mm:ss').format('mm')
                : time.arrivalTime
                ? moment(time.arrivalTime, 'HH:mm:ss').format('mm')
                : null,
              tripClassName: time.trip.tripClass.tripClassName,
              tripClassColor: time.trip.tripClass.tripClassColor,
              lastStop: time.trip.tripOperationLists[0].endStation.stationName,

              sameTripBlockTrips: time.trip.tripBlock.trips.filter(
                trip => trip.id !== time.trip.id
              ),
              /*join(
                time.trip.tripBlock.trips.map(
                  trip => trip.tripOperationLists[0].endStation.stationName
                ),
                '・'
              )
              */ operationSightings: time.trip.tripOperationLists.map(
                tripOperationList => {
                  const operationSighting = find(
                    changes.sightings.currentValue as IOperationSighting[],
                    o =>
                      o.circulatedOperationId === tripOperationList.operation.id
                  );
                  if (operationSighting && operationSighting.formation) {
                    return {
                      operationNumber:
                        operationSighting.circulatedOperation.operationNumber,
                      formationNumber:
                        operationSighting.formation.formationNumber,
                      sightingTime: operationSighting.sightingTime
                    };
                  } else {
                    return {
                      operationNumber:
                        operationSighting.circulatedOperation.operationNumber,
                      formationNumber: null,
                      sightingTime: operationSighting.sightingTime
                    };
                  }
                }
              )
            }))
          };
        });
        return mappedByTime;
      });

      console.log(mapped);

      const sorted = concat([], ...mapped).map(row => ({
        ...row,
        times: sortBy(row.times, o => o.minute)
      }));

      this.data = sorted;
      this.data.forEach(col => {
        if (this.maxColumnsCount < col.times.length) {
          this.maxColumnsCount = col.times.length;
        }
      });
      console.log(this.maxColumnsCount);
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

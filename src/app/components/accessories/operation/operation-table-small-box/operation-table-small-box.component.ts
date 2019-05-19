import {
  Component,
  OnInit,
  Input,
  ChangeDetectionStrategy
} from '@angular/core';
import * as _ from 'lodash';
import * as moment from 'moment';
import { GlobalFunctionService } from 'src/app/services/global-function.service';

@Component({
  selector: 'app-operation-table-small-box',
  templateUrl: './operation-table-small-box.component.html',
  styleUrls: ['./operation-table-small-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationTableSmallBoxComponent implements OnInit {
  @Input() dia: string;
  @Input() stations: any[];
  @Input() operation: any;
  modifiedOperation: any;
  color: string;
  tripString: any[];

  stationList = {};

  constructor(private globalFunctionService: GlobalFunctionService) {}

  ngOnInit() {
    _.forEach(this.stations, obj => {
      this.stationList[obj.id] = obj.station_name;
    });
    this.modifiedOperation = {
      ...this.operation,
      trips: _.map(this.operation.trips, obj => {
        return {
          ...obj,
          times: _.map(obj.times, obj2 => {
            return {
              ...obj2,
              arrival_time: obj2.arrival_time
                ? this.returnDate(obj2.arrival_time)
                : null,
              departure_time: obj2.departure_time
                ? this.returnDate(obj2.departure_time)
                : null
            };
          })
        };
      })
    };
    this.color = this.returnOperationNumberColor(
      this.operation.operation_number
    );
    this.tripString = this.generateTripString(this.modifiedOperation.trips);
  }

  generateTripString(trips: any) {
    const tripList = [];
    trips.forEach((trip, index) => {
      let strList = {};
      if (trip.trip_direction === 0) {
        strList['tripId'] = trip.id;
        strList['tripColor'] = trip.trip_class.trip_class_color;
        strList['tripDirection'] = 'up';
        strList['downSideMark'] = trip.times[0].depot_out ? '〇' : '┗';
        strList['downSideStation'] = this.stationList[trip.times[0].station_id];
        strList['downSideTime'] = trip.times[0].departure_time;
        strList['downSideArrow'] = '→→';
        strList['tripClass'] = trip.trip_class.trip_class_name[0];
        strList['tripNumber'] = trip.trip_number;
        strList['upSideArrow'] = '→→';
        strList['upSideTime'] = trip.times[trip.times.length - 1].arrival_time;
        strList['upSideStation'] = this.stationList[
          trip.times[trip.times.length - 1].station_id
        ];
        strList['upSideMark'] = trip.times[trip.times.length - 1].depot_in
          ? '△'
          : '┓';
      }
      if (trip.trip_direction === 1) {
        strList['tripId'] = trip.id;
        strList['tripColor'] = trip.trip_class.trip_class_color;
        strList['tripDirection'] = 'down';
        strList['downSideMark'] = trip.times[trip.times.length - 1].depot_in
          ? '△'
          : '┏';
        strList['downSideStation'] = this.stationList[
          trip.times[trip.times.length - 1].station_id
        ];
        strList['downSideTime'] = trip.times[trip.times.length - 1].arrival_time;
        strList['downSideArrow'] = '←←';
        strList['tripClass'] = trip.trip_class.trip_class_name[0];
        strList['tripNumber'] = trip.trip_number;
        strList['upSideArrow'] = '←←';
        strList['upSideTime'] = trip.times[0].departure_time;
        strList['upSideStation'] = this.stationList[trip.times[0].station_id];
        strList['upSideMark'] = trip.times[0].depot_out ? '〇' : '┛';
      }

      tripList.push(strList);

      if (
        trips[index + 1] &&
        trip.trip_direction === trips[index + 1].trip_direction
      ) {
        strList = {};
        if (trip.trip_direction === 0) {
          strList['tripId'] = null;
          strList['line'] = '┏━━━━━━━━━━━━━━━━━━━━┛';
        }
        if (trip.trip_direction === 1) {
          strList['tripId'] = null;
          strList['line'] = '┗━━━━━━━━━━━━━━━━━━━━┓';
        }
        tripList.push(strList);
      }
    });

    return tripList;
  }

  returnStationName(stationId: string) {
    const result = this.stationList[stationId];
    return result;
  }

  returnDate(dateString: string) {
    return moment(dateString, 'HH:mm:ss').format('HHmm');
  }

  returnOperationNumberColor(operationNumber: number) {
    return this.globalFunctionService.returnOperationNumberColor(
      operationNumber
    );
  }

  trackByItem(index: number, value: any) {
    return value ? value.tripId : null;
  }
}

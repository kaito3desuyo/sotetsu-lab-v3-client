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
    return value ? value.id : null;
  }
}

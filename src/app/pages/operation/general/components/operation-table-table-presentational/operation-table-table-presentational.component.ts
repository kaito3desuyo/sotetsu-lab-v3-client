import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { IOperation } from 'src/app/general/interfaces/operation';
import { IStation } from 'src/app/general/interfaces/station';
import find from 'lodash/find';
import { ITripClass } from 'src/app/general/interfaces/trip-class';
import moment from 'moment';

@Component({
  selector: 'app-operation-table-table-presentational',
  templateUrl: './operation-table-table-presentational.component.html',
  styleUrls: ['./operation-table-table-presentational.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationTableTablePresentationalComponent {
  @Input() operationTrips: IOperation;
  @Input() stations: IStation[];
  @Input() tripClasses: ITripClass[];

  constructor() {}

  convertTimeToDateObject(time: string): Date {
    return moment(time, 'HH:mm:ss').toDate();
  }

  findStationName(id: string): string {
    if (!this.stations) {
      return '';
    }
    const findObj = find(this.stations, station => station.id === id);
    return findObj ? this.formatStationName(findObj.stationName) : '';
  }

  findTripClassName(id: string): string {
    if (!this.tripClasses) {
      return '';
    }
    const findObj = find(this.tripClasses, tripClass => tripClass.id === id);
    return findObj ? this.formatTripClassName(findObj.tripClassName) : '';
  }

  findTripClassColor(id: string): string {
    if (!this.tripClasses) {
      return '';
    }
    const findObj = find(this.tripClasses, tripClass => tripClass.id === id);
    return findObj ? findObj.tripClassColor : '';
  }

  formatStationName(stationName: string): string {
    if (stationName.length === 2) {
      return stationName[0] + '　' + stationName[1];
    } else {
      return stationName;
    }
  }

  formatTripClassName(tripClassName: string): string {
    switch (tripClassName) {
      case '通勤特急':
        return '通特';
      case '通勤急行':
        return '通急';
      default:
        return tripClassName;
    }
  }

  getOperationNumberColor(operationNumber: string) {
    if (!operationNumber) {
      return 'transparent';
    }
    if (operationNumber === '100') {
      return 'rgba(0,0,0,0.12)';
    }
    switch (operationNumber[0]) {
      case '1':
        return 'rgba(244,67,54,0.12)';
      case '4':
        return 'rgba(76,175,80,0.12)';
      case '5':
        return 'rgba(33,150,243,0.12)';
      case '6':
        return 'rgba(63,81,181,0.12)';
      default:
        return 'transparent';
    }
  }
}

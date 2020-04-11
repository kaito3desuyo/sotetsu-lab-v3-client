import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { IOperation } from 'src/app/general/interfaces/operation';
import { IStation } from 'src/app/general/interfaces/station';
import { find } from 'lodash-es';
import { ITripClass } from 'src/app/general/interfaces/trip-class';
import moment from 'moment';
import { ICalendar } from 'src/app/general/interfaces/calendar';

@Component({
    selector: 'app-operation-table-table-presentational',
    templateUrl: './operation-table-table-presentational.component.html',
    styleUrls: ['./operation-table-table-presentational.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationTableTablePresentationalComponent {
    @Input() operationTrips: IOperation[];
    @Input() stations: IStation[];
    @Input() tripClasses: ITripClass[];
    @Input() calendar: ICalendar;

    constructor() {}

    convertTimeToDateObject(time: string): Date {
        return moment(time, 'HH:mm:ss').toDate();
    }

    findStationName(id: string): string {
        if (!this.stations) {
            return '';
        }
        const findObj = find(this.stations, (station) => station.id === id);
        return findObj ? this.formatStationName(findObj.stationName) : '';
    }

    findTripClassName(id: string): string {
        if (!this.tripClasses) {
            return '';
        }
        const findObj = find(
            this.tripClasses,
            (tripClass) => tripClass.id === id
        );
        return findObj ? this.formatTripClassName(findObj.tripClassName) : '';
    }

    findTripClassColor(id: string): string {
        if (!this.tripClasses) {
            return '';
        }
        const findObj = find(
            this.tripClasses,
            (tripClass) => tripClass.id === id
        );
        return findObj ? findObj.tripClassColor : '';
    }

    formatStationName(stationName: string): string {
        if (stationName.length === 2) {
            return stationName[0] + '　' + stationName[1];
        } else if (stationName === '羽沢横浜国大') {
            return '羽沢横国';
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
            case '直通特急':
                return '直特';
            case '直通各停':
                return '直各';
            case '通勤快速':
                return '通快';
            case '各駅停車':
                return '各停';
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
                return 'rgba(244, 67, 54, 0.12)';
            case '2':
                return 'rgba(255, 193, 7, 0.12)';
            case '4':
                return 'rgba(139, 195, 74, 0.12)';
            case '5':
                return 'rgba(33, 150, 243, 0.12)';
            case '6':
                return 'rgba(63, 81, 181, 0.12)';
            case '7':
            case '8':
            case '9':
                return 'rgba(0, 150, 136, 0.12)';
            default:
                return 'transparent';
        }
    }
}

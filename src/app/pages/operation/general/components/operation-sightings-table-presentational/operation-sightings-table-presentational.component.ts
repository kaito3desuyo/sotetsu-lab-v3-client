import {
    Component,
    OnInit,
    ChangeDetectionStrategy,
    Input,
    OnChanges,
    SimpleChanges,
    ViewChild,
    Output,
    EventEmitter
} from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { IOperationSightingTable } from '../../interfaces/operation-sighting-table';
import { MatSort } from '@angular/material/sort';
import moment from 'moment';

@Component({
    selector: 'app-operation-sightings-table-presentational',
    templateUrl: './operation-sightings-table-presentational.component.html',
    styleUrls: ['./operation-sightings-table-presentational.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationSightingsTablePresentationalComponent
    implements OnChanges {
    @Input() mode: 'formation' | 'operation';
    @Input() data: IOperationSightingTable[];
    @Input() displayedColumns: string[] = [];
    @Input() currentCalendarId: string;

    dataSource: MatTableDataSource<IOperationSightingTable>;

    @ViewChild(MatSort, { static: true }) sort: MatSort;

    constructor() {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.data) {
            this.dataSource = new MatTableDataSource(changes.data.currentValue);
            this.dataSource.sort = this.sort;
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

    calcDiffTimeToCurrentTime(dateString: string): number {
        const date = moment(dateString).subtract(
            moment(dateString).hour() < 4 ? 1 : 0,
            'days'
        );
        const now = moment().subtract(moment().hour() < 4 ? 1 : 0, 'days');
        return now.date() - date.date();
    }
}

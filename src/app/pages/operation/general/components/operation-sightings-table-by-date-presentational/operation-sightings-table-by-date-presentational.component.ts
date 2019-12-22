import {
    Component,
    OnInit,
    ChangeDetectionStrategy,
    Input,
    SimpleChanges,
    OnChanges
} from '@angular/core';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import groupBy from 'lodash/groupBy';
import moment, { Moment } from 'moment';
import map from 'lodash/map';
import { IFormation } from 'src/app/general/interfaces/formation';
import { forIn } from 'lodash';
import { ICalendar } from 'src/app/general/interfaces/calendar';

@Component({
    selector: 'app-operation-sightings-table-by-date-presentational',
    templateUrl:
        './operation-sightings-table-by-date-presentational.component.html',
    styleUrls: [
        './operation-sightings-table-by-date-presentational.component.scss'
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationSightingsTableByDatePresentationalComponent
    implements OnChanges {
    @Input() formations: IFormation[];
    @Input() operationSightings: IOperationSighting[];
    @Input() dates: Moment[];
    @Input() calendars: { date: Moment; calendar: ICalendar }[];

    groupedByDate = {};

    constructor() {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.operationSightings) {
            this.groupedByDate = {};
            const groupByFormationId = groupBy(
                this.operationSightings,
                v => v.formationId
            );
            forIn(groupByFormationId, (v: IOperationSighting[], k: string) => {
                this.groupedByDate[k] = groupBy(v, o =>
                    moment(o.sightingTime)
                        .subtract(
                            moment(o.sightingTime).hour() < 4 ? 1 : 0,
                            'days'
                        )
                        .format('YYYY-MM-DD')
                );
            });
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

    convertMoment(isoString: string): Moment {
        return moment(isoString);
    }
}

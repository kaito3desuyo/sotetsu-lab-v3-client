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
import moment from 'moment';
import { forIn } from 'lodash';
import map from 'lodash/map';

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
    @Input() operationSightings: IOperationSighting[];

    groupedByFormationId = {};
    groupedByDate = [];

    constructor() {}

    ngOnChanges(changes: SimpleChanges): void {
        //Called before any other lifecycle hook. Use it to inject dependencies, but avoid any serious work here.
        //Add '${implements OnChanges}' to the class.
        if (changes.operationSightings) {
            this.groupedByFormationId = groupBy(
                this.operationSightings,
                v => v.formationId
            );
            this.groupedByDate = map(
                this.groupedByFormationId,
                (o: IOperationSighting[], k: string) => {
                    return {
                        [k]: groupBy(o, v =>
                            moment(v.sightingTime).format('YYYY-MM-DD')
                        )
                    };
                }
            );

            console.log(this.groupedByDate);
        }
    }
}

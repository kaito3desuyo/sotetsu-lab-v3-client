import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Moment } from 'moment';
import { OperationPastTimeStateQuery } from '../../states/operation-past-time.state';

@Component({
    selector: 'app-operation-past-time-main-c',
    templateUrl: './operation-past-time-main-c.component.html',
    styleUrls: ['./operation-past-time-main-c.component.scss'],
})
export class OperationPastTimeMainCComponent {
    readonly referenceDate$ = this.operationPastTimeStateQuery.referenceDate$;
    readonly days$ = this.operationPastTimeStateQuery.days$;
    readonly calendars$ = this.operationPastTimeStateQuery.calendars$;
    readonly formations$ = this.operationPastTimeStateQuery.formations$;
    readonly operationSightings$ =
        this.operationPastTimeStateQuery.selectOperationSightingsGroupedByDate();

    constructor(
        private readonly router: Router,
        private readonly operationPastTimeStateQuery: OperationPastTimeStateQuery
    ) {}

    onReceiveClickSearch(params: {
        referenceDate: Moment;
        days: number;
    }): void {
        this.router.navigate([
            'operation',
            'past-time',
            {
                reference_date: params.referenceDate.format('YYYY-MM-DD'),
                days: params.days,
            },
        ]);
    }
}

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Moment } from 'moment';
import { OperationPastTimeStateQuery } from '../../../states/operation-past-time.state';
import { OperationPastTimeService } from '../../services/operation-past-time.service';

@Component({
    selector: 'app-operation-sightings-search-form-container',
    templateUrl: './operation-sightings-search-form-container.component.html',
    styleUrls: ['./operation-sightings-search-form-container.component.scss'],
})
export class OperationSightingsSearchFormContainerComponent {
    readonly referenceDate$ = this.operationPastTimeStateQuery.referenceDate$;
    readonly days$ = this.operationPastTimeStateQuery.days$;

    constructor(
        private router: Router,
        private operationPastTimeService: OperationPastTimeService,
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

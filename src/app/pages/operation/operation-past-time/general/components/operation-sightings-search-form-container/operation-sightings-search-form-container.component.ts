import { Component, OnInit } from '@angular/core';
import { Moment } from 'moment';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { OperationPastTimeService } from '../../services/operation-past-time.service';

@Component({
    selector: 'app-operation-sightings-search-form-container',
    templateUrl: './operation-sightings-search-form-container.component.html',
    styleUrls: ['./operation-sightings-search-form-container.component.scss'],
})
export class OperationSightingsSearchFormContainerComponent {
    referenceDate$: Observable<Moment>;
    days$: Observable<number>;

    constructor(
        private router: Router,
        private operationPastTimeService: OperationPastTimeService
    ) {
        this.referenceDate$ = this.operationPastTimeService.referenceDate$;
        this.days$ = this.operationPastTimeService.days$;
    }

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

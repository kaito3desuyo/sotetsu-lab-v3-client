import { Component, OnInit } from '@angular/core';
import { Moment } from 'moment';
import { Router } from '@angular/router';

@Component({
    selector: 'app-operation-sightings-search-form-container',
    templateUrl: './operation-sightings-search-form-container.component.html',
    styleUrls: ['./operation-sightings-search-form-container.component.scss']
})
export class OperationSightingsSearchFormContainerComponent {
    constructor(private router: Router) {}

    onReceiveClickSearch(params: {
        referenceDate: Moment;
        days: number;
    }): void {
        this.router.navigate([
            'operation',
            'past-time',
            {
                reference_date: params.referenceDate.format('YYYY-MM-DD'),
                days: params.days
            }
        ]);
    }
}

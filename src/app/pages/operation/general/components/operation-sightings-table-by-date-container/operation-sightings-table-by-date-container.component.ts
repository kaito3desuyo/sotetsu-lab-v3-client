import { Component, OnInit } from '@angular/core';
import { OperationPastTimeService } from '../../services/operation-past-time.service';
import { Observable } from 'rxjs';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';

@Component({
    selector: 'app-operation-sightings-table-by-date-container',
    templateUrl: './operation-sightings-table-by-date-container.component.html',
    styleUrls: ['./operation-sightings-table-by-date-container.component.scss']
})
export class OperationSightingsTableByDateContainerComponent {
    operationSightings$: Observable<IOperationSighting[]>;

    constructor(private operationPastTimeService: OperationPastTimeService) {
        this.operationSightings$ = this.operationPastTimeService.operationSightings$;
    }
}

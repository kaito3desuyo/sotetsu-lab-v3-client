import { Component, Inject, Injector } from '@angular/core';
import { IOperationSightingTableData } from '../../interfaces/operation-sighting-table';
import { Observable } from 'rxjs';
import { BaseComponent } from 'src/app/general/classes/base-component';
import { OperationRealTimeService } from '../../services/operation-real-time.service';

@Component({
    selector: 'app-operation-sightings-table-by-formation-container',
    templateUrl:
        './operation-sightings-table-by-formation-container.component.html',
    styleUrls: [
        './operation-sightings-table-by-formation-container.component.scss',
    ],
})
export class OperationSightingsTableByFormationContainerComponent extends BaseComponent {
    data$: Observable<IOperationSightingTableData[]>;
    displayedColumn = [
        'formationNumber',
        'operationNumber',
        'trip',
        'sightingTime',
        'updatedAt',
    ];
    currentCalendarId$: Observable<string>;

    constructor(
        @Inject(Injector) injector: Injector,
        private operationRealTimeService: OperationRealTimeService
    ) {
        super(injector);
        this.data$ = this.operationRealTimeService.formationTableData$;
        this.currentCalendarId$ = this.operationRealTimeService.currentCalendarId$;
        this.subscription = this.operationRealTimeService.isVisibleCurrentPosition$.subscribe(
            (bool) => {
                if (bool) {
                    this.displayedColumn = [
                        'formationNumber',
                        'operationNumber',
                        'trip',
                        'sightingTime',
                        'updatedAt',
                    ];
                } else {
                    this.displayedColumn = [
                        'formationNumber',
                        'operationNumber',
                        'sightingTime',
                        'updatedAt',
                    ];
                }
            }
        );
    }
}

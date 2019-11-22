import { Component, Inject, Injector } from '@angular/core';
import { OperationRealTimeService } from '../../services/operation-real-time.service';
import { IOperationSightingTable } from '../../interfaces/operation-sighting-table';
import { Observable } from 'rxjs';
import { BaseComponent } from 'src/app/general/classes/base-component';

@Component({
  selector: 'app-operation-sightings-table-by-operation-container',
  templateUrl:
    './operation-sightings-table-by-operation-container.component.html',
  styleUrls: [
    './operation-sightings-table-by-operation-container.component.scss'
  ]
})
export class OperationSightingsTableByOperationContainerComponent extends BaseComponent {
  data$: Observable<IOperationSightingTable[]>;
  displayedColumn = [
    'operationNumber',
    'formationNumber',
    'trip',
    'sightingTime',
    'updatedAt'
  ];
  currentCalendarId$: Observable<string>;

  constructor(
    @Inject(Injector) injector: Injector,
    private operationRealTimeService: OperationRealTimeService
  ) {
    super(injector);
    this.data$ = this.operationRealTimeService.getOperationTableData();
    this.currentCalendarId$ = this.operationRealTimeService.currentCalendarId$;
    this.subscription = this.operationRealTimeService.isVisibleCurrentPosition$.subscribe(
      bool => {
        if (bool) {
          this.displayedColumn = [
            'operationNumber',
            'formationNumber',
            'trip',
            'sightingTime',
            'updatedAt'
          ];
        } else {
          this.displayedColumn = [
            'operationNumber',
            'formationNumber',
            'sightingTime',
            'updatedAt'
          ];
        }
      }
    );
  }
}

import { Component } from '@angular/core';
import { OperationRealTimeService } from '../../services/operation-real-time.service';
import { IOperationSightingTable } from '../../interfaces/operation-sighting-table';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-operation-sightings-table-by-operation-container',
  templateUrl:
    './operation-sightings-table-by-operation-container.component.html',
  styleUrls: [
    './operation-sightings-table-by-operation-container.component.scss'
  ]
})
export class OperationSightingsTableByOperationContainerComponent {
  data$: Observable<IOperationSightingTable[]>;
  displayedColumn = [
    'operationNumber',
    'formationNumber',
    'trip',
    'sightingTime',
    'updatedAt'
  ];
  currentCalendarId$: Observable<string>;

  constructor(private operationRealTimeService: OperationRealTimeService) {
    this.data$ = this.operationRealTimeService.getOperationTableData();
    this.currentCalendarId$ = this.operationRealTimeService.currentCalendarId$;
  }
}

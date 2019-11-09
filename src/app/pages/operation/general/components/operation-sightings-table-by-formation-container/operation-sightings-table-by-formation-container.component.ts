import { Component } from '@angular/core';
import { OperationRealTimeService } from '../../services/operation-real-time.service';
import { IOperationSightingTable } from '../../interfaces/operation-sighting-table';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-operation-sightings-table-by-formation-container',
  templateUrl:
    './operation-sightings-table-by-formation-container.component.html',
  styleUrls: [
    './operation-sightings-table-by-formation-container.component.scss'
  ]
})
export class OperationSightingsTableByFormationContainerComponent {
  data$: Observable<IOperationSightingTable[]>;
  displayedColumn = [
    'formationNumber',
    'operationNumber',
    'trip',
    'sightingTime',
    'updatedAt'
  ];
  currentCalendarId$: Observable<string>;

  constructor(private operationRealTimeService: OperationRealTimeService) {
    this.data$ = this.operationRealTimeService.getFormationTableData();
    this.currentCalendarId$ = this.operationRealTimeService.currentCalendarId$;
  }
}

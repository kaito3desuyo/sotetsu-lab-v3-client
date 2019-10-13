import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { IOperation } from 'src/app/general/interfaces/operation';
import { OperationTableService } from '../../services/operation-table.service';
import { IStation } from 'src/app/general/interfaces/station';
import { ITripClass } from 'src/app/general/interfaces/trip-class';

@Component({
  selector: 'app-operation-table-table-container',
  templateUrl: './operation-table-table-container.component.html',
  styleUrls: ['./operation-table-table-container.component.scss']
})
export class OperationTableTableContainerComponent {
  operationTrips$: Observable<IOperation[]>;
  stations$: Observable<IStation[]>;
  tripClasses$: Observable<ITripClass[]>;

  constructor(private operationTableService: OperationTableService) {
    this.operationTrips$ = this.operationTableService.getOperationTrips();
    this.stations$ = this.operationTableService.getStations();
    this.tripClasses$ = this.operationTableService.getTripClasses();
  }
}

import { Component, OnInit } from '@angular/core';
import { OperationRouteDiagramService } from '../../services/operation-route-diagram.service';
import { Observable } from 'rxjs';
import { IStation } from 'src/app/general/interfaces/station';
import { ITripOperationList } from 'src/app/general/interfaces/trip-operation-list';

@Component({
  selector: 'app-operation-route-diagram-drawing-container',
  templateUrl: './operation-route-diagram-drawing-container.component.html',
  styleUrls: ['./operation-route-diagram-drawing-container.component.scss']
})
export class OperationRouteDiagramDrawingContainerComponent {
  stations$: Observable<IStation[]>;
  tripOperationLists$: Observable<ITripOperationList[]>;

  constructor(
    private operationRouteDiagramService: OperationRouteDiagramService
  ) {
    this.stations$ = this.operationRouteDiagramService.getStations();
    this.tripOperationLists$ = this.operationRouteDiagramService.getTripOperationLists();
  }
}

import { Component, OnInit } from '@angular/core';
import { OperationRouteDiagramService } from '../../services/operation-route-diagram.service';
import { Observable } from 'rxjs';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { IOperation } from 'src/app/general/interfaces/operation';

@Component({
  selector: 'app-operation-route-diagram-title-container',
  templateUrl: './operation-route-diagram-title-container.component.html',
  styleUrls: ['./operation-route-diagram-title-container.component.scss']
})
export class OperationRouteDiagramTitleContainerComponent {
  calendar$: Observable<ICalendar>;
  operation$: Observable<IOperation>;

  constructor(
    private operationRouteDiagramService: OperationRouteDiagramService
  ) {
    this.calendar$ = this.operationRouteDiagramService.getCalendar();
    this.operation$ = this.operationRouteDiagramService.getOperation();
  }
}

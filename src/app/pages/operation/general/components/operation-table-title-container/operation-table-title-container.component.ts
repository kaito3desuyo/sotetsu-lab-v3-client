import { Component, OnInit } from '@angular/core';
import { OperationTableService } from '../../services/operation-table.service';
import { Observable } from 'rxjs';
import { ICalendar } from 'src/app/general/interfaces/calendar';

@Component({
  selector: 'app-operation-table-title-container',
  templateUrl: './operation-table-title-container.component.html',
  styleUrls: ['./operation-table-title-container.component.scss']
})
export class OperationTableTitleContainerComponent {
  calendar$: Observable<ICalendar>;

  constructor(private operationTableService: OperationTableService) {
    this.calendar$ = this.operationTableService.getCalendar();
  }
}

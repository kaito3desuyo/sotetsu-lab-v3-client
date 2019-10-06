import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { IStation } from 'src/app/general/interfaces/station';
import { TimetableEditorService } from '../../services/timetable-editor.service';
import { IOperation } from 'src/app/general/interfaces/operation';
import { ITripClass } from 'src/app/general/interfaces/trip-class';

@Component({
  selector: 'app-timetable-editor-form-container',
  templateUrl: './timetable-editor-form-container.component.html',
  styleUrls: ['./timetable-editor-form-container.component.scss']
})
export class TimetableEditorFormContainerComponent {
  stations$: Observable<IStation[]>;
  operations$: Observable<IOperation[]>;
  tripClasses$: Observable<ITripClass[]>;

  constructor(private timetableEditorService: TimetableEditorService) {
    this.stations$ = this.timetableEditorService.getStations();
    this.operations$ = this.timetableEditorService.getOperations();
    this.tripClasses$ = this.timetableEditorService.getTripClasses();
  }
}

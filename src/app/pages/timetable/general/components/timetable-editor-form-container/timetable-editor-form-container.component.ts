import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { IStation } from 'src/app/general/interfaces/station';
import { TimetableEditorService } from '../../services/timetable-editor.service';
import { IOperation } from 'src/app/general/interfaces/operation';
import { ITripClass } from 'src/app/general/interfaces/trip-class';
import { ITimetableTripForm } from '../../interfaces/timetable-trip-form';
import { ITripBlock } from 'src/app/general/models/trip-block/trip-block';

@Component({
  selector: 'app-timetable-editor-form-container',
  templateUrl: './timetable-editor-form-container.component.html',
  styleUrls: ['./timetable-editor-form-container.component.scss']
})
export class TimetableEditorFormContainerComponent {
  tripBlock$: Observable<ITripBlock>;
  stations$: Observable<IStation[]>;
  operations$: Observable<IOperation[]>;
  tripClasses$: Observable<ITripClass[]>;
  clearEvent$: Observable<void>;

  constructor(private timetableEditorService: TimetableEditorService) {
    this.tripBlock$ = this.timetableEditorService.getTripBlock();
    this.stations$ = this.timetableEditorService.getStations();
    this.operations$ = this.timetableEditorService.getOperations();
    this.tripClasses$ = this.timetableEditorService.getTripClasses();
    this.clearEvent$ = this.timetableEditorService.receiveClearEvent();
  }

  onReceiveClickSave(form: ITimetableTripForm[]): void {
    this.timetableEditorService.emitSaveEvent(form);
  }
}

import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Output,
  EventEmitter,
  Inject,
  Injector
} from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { BaseComponent } from 'src/app/general/classes/base-component';

@Component({
  selector: 'app-timetable-add-mode-select-presentational',
  templateUrl: './timetable-add-mode-select-presentational.component.html',
  styleUrls: ['./timetable-add-mode-select-presentational.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimetableAddModeSelectPresentationalComponent extends BaseComponent {
  isSaveTripsIndividually = this.fb.control(false);

  @Output() changeIsSaveTripsIndividually: EventEmitter<
    boolean
  > = new EventEmitter<boolean>();

  constructor(@Inject(Injector) injector: Injector, private fb: FormBuilder) {
    super(injector);
    this.subscription = this.isSaveTripsIndividually.valueChanges.subscribe(
      bool => {
        this.changeIsSaveTripsIndividually.emit(bool);
      }
    );
  }
}

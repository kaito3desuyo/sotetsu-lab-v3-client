import {
  Component,
  ChangeDetectionStrategy,
  Input,
  OnInit
} from '@angular/core';
import { IStation } from 'src/app/general/interfaces/station';
import { FormGroup, FormBuilder, FormArray, Validators } from '@angular/forms';
import { IOperation } from 'src/app/general/interfaces/operation';
import { ITripClass } from 'src/app/general/interfaces/trip-class';
import { find, sortBy } from 'lodash';
import { MatRadioChange } from '@angular/material/radio';
import { IStop } from 'src/app/general/models/stop/stop';

@Component({
  selector: 'app-timetable-editor-form-presentational',
  templateUrl: './timetable-editor-form-presentational.component.html',
  styleUrls: ['./timetable-editor-form-presentational.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimetableEditorFormPresentationalComponent implements OnInit {
  tripForm: FormArray = this.fb.array([]);

  @Input() stations: IStation[];
  @Input() operations: IOperation[];
  @Input() tripClasses: ITripClass[];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.createTrip();
  }

  createTrip(): void {
    this.tripForm.push(this.generateTrip());
  }

  deleteTrip(index: number): void {
    this.tripForm.removeAt(index);
  }

  generateTrip(): FormGroup {
    return this.fb.group({
      tripNumber: ['', Validators.required],
      operationId: ['', Validators.required],
      tripClassId: ['', Validators.required],
      depotIn: [''],
      depotOut: [''],
      times: this.fb.array(
        this.stations.map(station => this.generateTime(station))
      )
    });
  }

  generateTime(station: IStation): FormGroup {
    return this.fb.group({
      stopType: ['noVia', Validators.required],
      stationId: [station.id, Validators.required],
      stopId: [{ value: '', disabled: true }, Validators.required],
      arrivalTime: [{ value: '', disabled: true }],
      departureTime: [{ value: '', disabled: true }]
    });
  }

  getTime(stationId: string, form: FormArray): FormGroup {
    return find(
      form.controls,
      ctls => ctls.get('stationId').value === stationId
    ) as FormGroup;
  }

  changeStopType(event: MatRadioChange, form: FormGroup): void {
    switch (event.value) {
      case 'stop':
      case 'passing':
        form.get('arrivalTime').enable();
        form.get('departureTime').enable();
        form.get('stopId').enable();
        break;
      case 'noVia':
        form.get('arrivalTime').disable();
        form.get('departureTime').disable();
        form.get('stopId').disable();
    }
  }

  sortStops(array: IStop[]) {
    return sortBy(array, o => o.stopName);
  }
}

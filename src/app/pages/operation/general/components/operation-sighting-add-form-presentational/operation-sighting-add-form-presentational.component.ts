import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Output,
  EventEmitter,
  Inject,
  Injector
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { BaseComponent } from 'src/app/general/classes/base-component';
import { IOperationSightingAddForm } from '../../interfaces/operation-sighting-add-form';

@Component({
  selector: 'app-operation-sighting-add-form-presentational',
  templateUrl: './operation-sighting-add-form-presentational.component.html',
  styleUrls: ['./operation-sighting-add-form-presentational.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationSightingAddFormPresentationalComponent
  extends BaseComponent
  implements OnInit {
  sightingForm = this.fb.group({
    agencyId: [''],
    vehicleNumber: ['', Validators.required],
    operationNumber: ['', Validators.required],
    timeSetting: ['currentTime'],
    sightingTime: [{ value: '', disabled: true }, Validators.required]
  });

  @Output() submitSighting: EventEmitter<
    IOperationSightingAddForm
  > = new EventEmitter<IOperationSightingAddForm>();

  constructor(@Inject(Injector) injector: Injector, private fb: FormBuilder) {
    super(injector);
  }

  ngOnInit() {
    this.sightingForm.get('timeSetting').valueChanges.subscribe(change => {
      switch (this.sightingForm.get('timeSetting').value) {
        case 'currentTime':
          this.sightingForm.get('sightingTime').disable();
          break;
        case 'specifiedTime':
          this.sightingForm.get('sightingTime').enable();
          break;
      }
    });
  }

  onClickSubmit() {
    this.submitSighting.emit(this.sightingForm.value);
  }
}

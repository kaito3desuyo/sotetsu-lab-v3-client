import {
  Component,
  ChangeDetectionStrategy,
  Input,
  OnChanges
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-dashboard-operation-search-menu-presentational',
  templateUrl:
    './dashboard-operation-search-menu-presentational.component.html',
  styleUrls: [
    './dashboard-operation-search-menu-presentational.component.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardOperationSearchMenuPresentationalComponent
  implements OnChanges {
  operationTableForm = this.fb.group({
    calenderId: ['', Validators.required]
  });

  @Input() calendersSelectList: { label: string; value: string }[];
  @Input() todaysCalenderId: string;

  constructor(private fb: FormBuilder) {}

  ngOnChanges() {
    this.operationTableForm.get('calenderId').setValue(this.todaysCalenderId);
  }
}

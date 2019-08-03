import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { Calender } from 'src/app/interfaces/calender';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-operation-table-search-form',
  templateUrl: './operation-table-search-form.component.html',
  styleUrls: ['./operation-table-search-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationTableSearchFormComponent implements OnInit {
  calenders: Calender[];

  searchParam = this.fb.group({
    dia: ['', Validators.required]
  });

  constructor(
    private apiService: ApiService,
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit() {
    this.getCalenders();
  }

  getCalenders(): void {
    this.apiService
      .getCalenders()
      .subscribe(calender => (this.calenders = calender));
  }

  onSubmit(): void {
    this.router.navigate([
      '/operation/table',
      {
        dia: this.searchParam.get('dia').value
      }
    ]);
  }
}

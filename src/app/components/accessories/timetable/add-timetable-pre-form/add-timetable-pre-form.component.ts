import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { Calender } from 'src/app/interfaces/calender';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-timetable-pre-form',
  templateUrl: './add-timetable-pre-form.component.html',
  styleUrls: ['./add-timetable-pre-form.component.scss']
})
export class AddTimetablePreFormComponent implements OnInit {
  calenders: Calender[];

  addTimetablePreForm = this.fb.group({
    dia: ['', Validators.required],
    direction: ['', Validators.required]
  });

  constructor(
    private apiService: ApiService,
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit() {
    this.getCalenders();
    console.log(this.addTimetablePreForm);
  }

  getCalenders() {
    this.apiService
      .getCalenders()
      .subscribe(calender => (this.calenders = calender));
  }

  onSubmit() {
    this.router.navigate([
      '/timetable/add',
      {
        dia: this.addTimetablePreForm.get('dia').value,
        direction: this.addTimetablePreForm.get('direction').value
      }
    ]);
  }
}

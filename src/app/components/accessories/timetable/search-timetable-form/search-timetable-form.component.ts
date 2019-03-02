import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { Station } from 'src/app/interfaces/station';
import { Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { Calender } from 'src/app/interfaces/calender';

@Component({
  selector: 'app-search-timetable-form',
  templateUrl: './search-timetable-form.component.html',
  styleUrls: ['./search-timetable-form.component.scss']
})
export class SearchTimetableFormComponent implements OnInit {
  stations: Station[];
  calenders: Calender[];

  searchParam = this.fb.group({
    dia: ['', Validators.required],
    direction: ['up', Validators.required],
    station: [{ value: '', disabled: true }, Validators.required]
  });

  constructor(
    private apiService: ApiService,
    private router: Router,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.getStations();
    this.getCalenders();
  }

  getCalenders(): void {
    this.apiService
      .getCalenders()
      .subscribe(calender => (this.calenders = calender));
  }

  getStations(): void {
    this.apiService.getStations('down').subscribe(stations => {
      this.stations = stations;
    });
  }

  changeSearchByStation(event) {
    if (event.checked) {
      this.searchParam.get('station').enable();
    } else {
      this.searchParam.get('station').disable();
    }
  }

  onSubmit() {
    if (!this.searchParam.get('station').value) {
      this.router.navigate([
        '/timetable/all-line',
        {
          dia: this.searchParam.get('dia').value,
          direction: this.searchParam.get('direction').value
        }
      ]);
    } else {
      this.router.navigate([
        '/timetable',
        {
          dia: this.searchParam.get('dia').value,
          direction: this.searchParam.get('direction').value,
          station: this.searchParam.get('station').value
        }
      ]);
    }
  }
}

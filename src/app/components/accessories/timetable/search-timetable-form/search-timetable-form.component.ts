import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { Station } from 'src/app/interfaces/station';
import { Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { Calender } from 'src/app/interfaces/calender';
import * as moment from 'moment';

@Component({
  selector: 'app-search-timetable-form',
  templateUrl: './search-timetable-form.component.html',
  styleUrls: ['./search-timetable-form.component.scss']
})
export class SearchTimetableFormComponent implements OnInit {
  stations: Station[];
  calenders: Calender[];
  routesStations: any[];

  date = moment()
    .subtract(Number(moment().format('H')) < 4 ? 1 : 0, 'days')
    .format('YYYYMMDD');

  todaysCalenderId = '';

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
    this.getRoutesStations();
    this.getStations();
    this.getCalenders();
    this.getCalenderByDate();
  }

  getCalenders(): void {
    this.apiService
      .getCalenders()
      .subscribe(calender => (this.calenders = calender));
  }

  getCalenderByDate(): void {
    this.apiService.getCalenderByDate(this.date).subscribe(data => {
      this.searchParam.get('dia').setValue(data.id);
    });
  }

  getRoutesStations(): void {
    this.apiService.getRoutesStations().subscribe(routesStations => {
      this.routesStations = routesStations;
    });
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
        '/timetable/station',
        {
          dia: this.searchParam.get('dia').value,
          direction: this.searchParam.get('direction').value,
          station: this.searchParam.get('station').value
        }
      ]);
    }
  }
}

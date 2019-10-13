import { Component, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { ApiService } from 'src/app/services/api.service';
import * as moment from 'moment';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss']
})
export class SidenavComponent implements OnInit {
  station = new FormControl('');

  routesStations = [];
  stations = [];
  calender = {};

  constructor(private api: ApiService) {}

  ngOnInit() {
    const date = moment()
      .subtract(Number(moment().format('H')) < 4 ? 1 : 0, 'days')
      .format('YYYYMMDD');
    this.api.getRoutesStations().subscribe(routesStations => {
      this.routesStations = routesStations;
    });
    this.api.getStations('down').subscribe(data => {
      this.stations = data;
    });
    this.api.getCalenderByDate(date).subscribe(data => {
      this.calender = data;
    });
  }
}

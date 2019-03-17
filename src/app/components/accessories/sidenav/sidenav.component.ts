import { Component, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss']
})
export class SidenavComponent implements OnInit {
  station = new FormControl('');

  stations = [];
  calender = {};

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getStations('down').subscribe(data => {
      this.stations = data;
    });
    this.api.getCalenderByToday().subscribe(data => {
      this.calender = data;
      console.log(data);
    });
  }
}

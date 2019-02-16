import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import { interval } from 'rxjs';

@Component({
  selector: 'app-real-time',
  templateUrl: './real-time.component.html',
  styleUrls: ['./real-time.component.scss']
})
export class RealTimeComponent implements OnInit {
  nowDateTime: Date;

  constructor() {}

  ngOnInit() {
    interval(1000).subscribe(result => {
      this.getNowDateTime();
    });
  }

  getNowDateTime() {
    this.nowDateTime = moment().toDate();
  }
}

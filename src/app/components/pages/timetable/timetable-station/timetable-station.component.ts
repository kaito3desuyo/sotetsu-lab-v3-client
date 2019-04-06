import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as moment from 'moment';
import * as _ from 'lodash';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-timetable-station',
  templateUrl: './timetable-station.component.html',
  styleUrls: ['./timetable-station.component.scss']
})
export class TimetableStationComponent implements OnInit {
  calender = {};
  timeOfStation: any = {};
  direction = null;
  hourList = [];
  sightingsList = [];
  maxColumns = 0;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    this.route.data.subscribe(
      (data: { timeOfStation: any; calender: any; sightings: any[] }) => {
        console.log(data);
        this.calender = data.calender;
        this.timeOfStation = data.timeOfStation;
        this.hourList = _(data.timeOfStation.times)
          .map(obj => {
            return moment(obj.departure_time, 'HH:mm:ss').format('H');
          })
          .uniq()
          .value();
        const columnLengthByHour = _.map(this.hourList, hour => {
          return this.getTimeByHour(hour).length;
        });
        this.maxColumns = _.reduce(columnLengthByHour, (n, m) => {
          return n < m ? m : n;
        });

        console.log(this.maxColumns);
        this.sightingsList = data.sightings;
      }
    );
    this.route.paramMap.subscribe(params => {
      // this.calenderId = params.get('dia');
      this.direction = params.get('direction');
    });
  }

  getTimeByHour(hour: number) {
    return _.filter(this.timeOfStation.times, obj => {
      return moment(obj.departure_time, 'HH:mm:ss').format('H') === String(hour);
    });
  }

  getOperationSightingsByOperationNumber(operationNumber) {
    const result = _.find(this.sightingsList, obj => {
      return obj.operation_number === operationNumber;
    });
    if (!result) {
      return '不明';
    }

    return result.formation_number;
  }

  convertToDateObj(timeStr: string) {
    return moment(timeStr, 'HH:mm:ss').toDate();
  }

  convertToInitial(str: string) {
    if (str === '大和') {
      return '和';
    }
    return str[0];
  }
}

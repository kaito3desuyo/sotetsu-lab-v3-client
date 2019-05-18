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

  timeByHourList = {};

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    this.route.data.subscribe(
      (data: { timeOfStation: any; calender: any; sightings: any[] }) => {
        console.log(data);
        this.calender = data.calender;
        this.timeOfStation = data.timeOfStation;
        if (!this.timeOfStation) {
          throw new Error('データがありません。');
        }
        this.hourList = _(data.timeOfStation.times)
          .map(obj => {
            return moment(
              obj.departure_time || obj.arrival_time,
              'HH:mm:ss'
            ).format('H');
          })
          .uniq()
          .value();
        _.forEach(this.hourList, hour => {
          this.timeByHourList[hour] = this.getTimeByHour(hour);
        });
        const columnLengthByHour = _.map(this.hourList, hour => {
          return this.getTimeByHour(hour).length;
        });
        this.maxColumns = _.reduce(columnLengthByHour, (n, m) => {
          return n < m ? m : n;
        });

        console.log(this.maxColumns);
        console.log(data.sightings);
        _.forEach(data.sightings, obj => {
          this.sightingsList[obj.operation_number] = obj.formation_number;
        });
      }
    );
    this.route.paramMap.subscribe(params => {
      // this.calenderId = params.get('dia');
      this.direction = params.get('direction');
    });
  }

  getTimeByHour(hour: number) {
    const filtered = _.filter(this.timeOfStation.times, obj => {
      return (
        moment(obj.departure_time || obj.arrival_time, 'HH:mm:ss').format(
          'H'
        ) === String(hour)
      );
    });
    const sorted = _.sortBy(filtered, obj => {
      const time = obj.departure_time || obj.arrival_time;
      return time;
    });
    return sorted;
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

  convertToMinute(timeStr: string) {
    return moment(timeStr, 'HH:mm:ss').format('mm');
  }

  convertToInitial(str: string) {
    if (str === '大和') {
      return '和';
    }
    return str[0];
  }
}

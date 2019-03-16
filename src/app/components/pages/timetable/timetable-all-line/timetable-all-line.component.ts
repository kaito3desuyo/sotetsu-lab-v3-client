import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as _ from 'lodash';
import * as moment from 'moment';

@Component({
  selector: 'app-timetable-all-line',
  templateUrl: './timetable-all-line.component.html',
  styleUrls: [
    './timetable-all-line.component.scss',
    '../../../../../assets/fonts/DiaPro-web/DiaPro.css'
  ]
})
export class TimetableAllLineComponent implements OnInit {
  stations = [];
  trips = [];

  direction: string = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.data.subscribe((data: { stations: any; trips: any }) => {
      console.log(data);
      this.stations = data.stations;
      this.trips = data.trips;
    });
    this.route.paramMap.subscribe(params => {
      this.direction = params.get('direction');
    });
  }

  getTime(mode: string, station: any, trip: any) {
    // console.log(station, trip);
    const time = _.find(trip.times, obj => {
      return obj.station_id === station.id;
    });

    if (
      time &&
      !this.arrivalChecker(station.station_name) &&
      mode === 'departure' &&
      !this.formatTime(time['departure_time'])
    ) {
      return this.formatTime(time['arrival_time']);
    }

    return time ? this.formatTime(time[mode + '_time']) : null;
  }

  arrivalChecker(stationName: string) {
    if (this.direction === 'up') {
    }
    if (this.direction === 'down') {
      switch (stationName) {
        case '大宮':
        case '新宿':
        case '二俣川':
        case '大和':
        case '海老名':
        case 'いずみ野':
        case '湘南台':
        case '厚木':
          return true;
      }
    }
    return false;
  }

  departureChecker(stationName: string) {
    if (this.direction === 'up') {
    }
    if (this.direction === 'down') {
      switch (stationName) {
        case '海老名':
        case '湘南台':
        case '厚木':
          return false;
      }
    }
    return true;
  }

  formatTime(timeString: string) {
    const time = moment(timeString, 'HH:mm:ss').format('HHmm');
    return timeString ? time : null;
  }

  throughChecker(stationIndex: number, trip: any) {
    const stopStationArray = [];
    this.stations.forEach((station, index) => {
      if (this.getTime('arrival', station, trip)) {
        stopStationArray.push(index);
      }
      if (this.getTime('departure', station, trip)) {
        stopStationArray.push(index);
      }
    });

    const start = stopStationArray[0];
    const end = stopStationArray[stopStationArray.length - 1];

    if (this.direction === 'up') {
    }
    if (this.direction === 'down') {
      switch (true) {
        case 0 <= start && start <= 26 && 34 <= end && end <= 52:
          if (27 <= stationIndex && stationIndex <= 33) {
            return '|';
          }
          break;
        case 0 <= start && start <= 36 && 45 <= end && end <= 51:
          if (37 <= stationIndex && stationIndex <= 44) {
            return '|';
          }
          break;
        case 0 <= start && start <= 43 && end === 52:
          if (44 <= stationIndex && stationIndex <= 51) {
            return '|';
          }
          break;
      }
    }

    if (
      stopStationArray[0] < stationIndex &&
      stationIndex < stopStationArray[stopStationArray.length - 1]
    ) {
      return '↓';
    }

    if (
      this.arrivalChecker(
        this.stations[stopStationArray[stopStationArray.length - 1]]
          .station_name
      ) &&
      this.departureChecker(
        this.stations[stopStationArray[stopStationArray.length - 1]]
          .station_name
      )
    ) {
      if (stationIndex === stopStationArray[stopStationArray.length - 1]) {
        return '=';
      }
    } else {
      if (stationIndex === stopStationArray[stopStationArray.length - 1] + 1) {
        return '=';
      }
    }

    return '‥';
  }
}

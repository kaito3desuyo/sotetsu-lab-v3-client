import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as _ from 'lodash';
import * as moment from 'moment';
import { MatPaginator, PageEvent } from '@angular/material';
import { ApiService } from 'src/app/services/api.service';
import { LoadingService } from 'src/app/services/loading.service';

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
  calender: any = {};

  stopStationsArray = [];

  calenderId: string = null;
  direction: string = null;

  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private loading: LoadingService
  ) {}

  ngOnInit() {
    this.route.data.subscribe(
      (data: {
        stations: any
        trips: any | any[]
        tripsCount: number
        calender: any
      }) => {
        console.log(data);
        this.stations = data.stations;
        this.trips = _.isArray(data.trips) ? data.trips : [data.trips];
        this.calender = data.calender;

        this.paginator.length = _.isArray(data.trips) ? data.tripsCount : 1;
        this.paginator.pageSize = 10;

        this.generateStopStationsArray();
        console.log('Stations', this.stations);
        console.log('StopStationsArray', this.stopStationsArray);
      }
    );
    this.route.paramMap.subscribe(params => {
      this.calenderId = params.get('dia');
      this.direction = params.get('direction');
    });
  }

  changePage(event: PageEvent) {
    console.log(event);
    this.loading.open();
    this.api
      .getTrips(
        this.calenderId,
        this.direction,
        event.pageIndex,
        event.pageSize
      )
      .subscribe(result => {
        this.trips = result;
        console.log(this.trips);
        this.generateStopStationsArray();
        this.loading.close();
      });
  }

  generateStopStationsArray() {
    this.stopStationsArray = this.trips.map(trip => {
      const stopStationArray = [];
      this.stations.forEach((station, index) => {
        if (this.getTime('arrival', station, trip)) {
          stopStationArray.push(index);
        }
        if (this.getTime('departure', station, trip)) {
          stopStationArray.push(index);
        }
      });
      return stopStationArray;
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
      switch (stationName) {
        case '大和':
        case 'いずみ野':
        case '二俣川':
        case '横浜':
        case '新宿':
        case '大宮':
        case '川越':
          return true;
      }
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
      switch (stationName) {
        case '横浜':
        case '川越':
          return false;
      }
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
    let time = moment(timeString, 'HH:mm:ss').format('Hmm');
    if (time.length === 3) {
      time = '-' + time;
    }
    return timeString ? time : null;
  }

  throughChecker(
    mode: string,
    stationIndex: number,
    trip: any,
    tripIndex: number
  ) {
    const stopStationArray = this.stopStationsArray[tripIndex];

    const start = stopStationArray[0];
    const end = stopStationArray[stopStationArray.length - 1];

    if (this.direction === 'up') {
      switch (true) {
        case start === 0 && 2 <= end && end <= 8:
          if (stationIndex === 1) {
            return '|';
          }
          break;
        case start === 0 && 16 <= end && end <= 52:
          if (stationIndex === 1 || (9 <= stationIndex && stationIndex <= 15)) {
            return '|';
          }
          break;
        case 0 <= start && start <= 8 && 16 <= end && end <= 52:
          if (9 <= stationIndex && stationIndex <= 15) {
            return '|';
          }
          break;
        case 0 <= start && start <= 18 && 26 <= end && end <= 52:
          if (19 <= stationIndex && stationIndex <= 25) {
            return '|';
          }
          break;
      }
    }
    if (this.direction === 'down') {
      switch (true) {
        case 0 <= start && start <= 26 && 34 <= end && end <= 52:
          if (27 <= stationIndex && stationIndex <= 33) {
            return '|';
          }
          break;
        case 0 <= start && start <= 36 && 45 <= end && end <= 51:
          if (37 <= stationIndex && stationIndex <= 43) {
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
      if (
        this.stations[stopStationArray[stopStationArray.length - 1] + 1] &&
        this.arrivalChecker(
          this.stations[stopStationArray[stopStationArray.length - 1] + 1]
            .station_name
        ) &&
        this.departureChecker(
          this.stations[stopStationArray[stopStationArray.length - 1] + 1]
            .station_name
        )
      ) {
        if (
          stationIndex === stopStationArray[stopStationArray.length - 1] + 1 &&
          mode === 'arrival'
        ) {
          return '=';
        }
      } else {
        if (
          stationIndex ===
          stopStationArray[stopStationArray.length - 1] + 1
        ) {
          return '=';
        }
      }
    }

    return '‥';
  }

  borderCheker(stationName: string) {
    if (this.direction === 'up') {
      switch (stationName) {
        case '厚木':
        case '希望ヶ丘':
        case '横浜':
        case '川越':
          return true;
      }
    }
    if (this.direction === 'down') {
      switch (stationName) {
        case '羽沢横浜国大':
        case '湘南台':
        case '海老名':
        case '厚木':
          return true;
      }
    }
    return false;
  }
}

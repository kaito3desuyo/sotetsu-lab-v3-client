import { Component, OnInit, ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import * as _ from "lodash";
import * as moment from "moment";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import { ApiService } from "src/app/services/api.service";
import { LoadingService } from "src/app/services/loading.service";

@Component({
  selector: "app-timetable-all-line",
  templateUrl: "./timetable-all-line.component.html",
  styleUrls: [
    "./timetable-all-line.component.scss",
    "../../../../../assets/fonts/DiaPro-web/DiaPro.css"
  ]
})
export class TimetableAllLineComponent implements OnInit {
  stations = [];
  trips = [];
  calender: any = {};

  stopStationsArray = [];

  calenderId: string = null;
  direction: string = null;

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private loading: LoadingService
  ) {}

  ngOnInit() {
    this.route.data.subscribe(
      (data: {
        stations: any;
        trips: any | any[];
        tripsCount: number;
        calender: any;
      }) => {
        console.log(data);
        this.stations = data.stations;
        this.trips =
          data.trips.rows && _.isArray(data.trips.rows)
            ? data.trips.rows
            : [data.trips];
        this.calender = data.calender;

        this.paginator.length = data.trips.count ? data.trips.count : 1;
        this.paginator.pageSize = 10;

        this.generateStopStationsArray();
        console.log("Stations", this.stations);
        console.log("StopStationsArray", this.stopStationsArray);
      }
    );
    this.route.paramMap.subscribe(params => {
      this.calenderId = params.get("dia");
      this.direction = params.get("direction");
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
        this.trips = result.rows;
        console.log(this.trips);
        this.generateStopStationsArray();
        this.loading.close();
      });
  }

  generateStopStationsArray() {
    this.stopStationsArray = this.trips.map(trip => {
      const stopStationArray = [];
      this.stations.forEach((station, index) => {
        if (this.getTime("arrival", station, trip)) {
          stopStationArray.push(index);
        }
        if (this.getTime("departure", station, trip)) {
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
      mode === "departure" &&
      !this.formatTime(time["departure_time"])
    ) {
      return this.formatTime(time["arrival_time"]);
    }

    return time ? this.formatTime(time[mode + "_time"]) : null;
  }

  arrivalChecker(stationName: string) {
    if (this.direction === "up") {
      switch (stationName) {
        case "大和":
        case "いずみ野":
        case "二俣川":
        case "横浜":
        case "新宿":
        case "大宮":
        case "川越":
          return true;
      }
    }
    if (this.direction === "down") {
      switch (stationName) {
        case "大宮":
        case "新宿":
        case "二俣川":
        case "大和":
        case "海老名":
        case "いずみ野":
        case "湘南台":
        case "厚木":
          return true;
      }
    }
    return false;
  }

  departureChecker(stationName: string) {
    if (this.direction === "up") {
      switch (stationName) {
        case "横浜":
        case "川越":
          return false;
      }
    }
    if (this.direction === "down") {
      switch (stationName) {
        case "海老名":
        case "湘南台":
        case "厚木":
          return false;
      }
    }
    return true;
  }

  formatTime(timeString: string) {
    let time = moment(timeString, "HH:mm:ss").format("Hmm");
    if (time.length === 3) {
      time = "-" + time;
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

    if (this.direction === "up") {
      switch (true) {
        case start === 0 && 2 <= end && end <= 8:
          if (stationIndex === 1) {
            return "|";
          }
          break;
        case start === 0 && 16 <= end && end <= 52:
          if (stationIndex === 1 || (9 <= stationIndex && stationIndex <= 15)) {
            return "|";
          }
          break;
        case 0 <= start && start <= 8 && 16 <= end && end <= 52:
          if (9 <= stationIndex && stationIndex <= 15) {
            return "|";
          }
          break;
        case 0 <= start && start <= 18 && 26 <= end && end <= 52:
          if (19 <= stationIndex && stationIndex <= 25) {
            return "|";
          }
          break;
      }
    }
    if (this.direction === "down") {
      switch (true) {
        case 0 <= start && start <= 26 && 34 <= end && end <= 52:
          if (27 <= stationIndex && stationIndex <= 33) {
            return "|";
          }
          break;
        case 0 <= start && start <= 36 && 45 <= end && end <= 51:
          if (37 <= stationIndex && stationIndex <= 43) {
            return "|";
          }
          break;
        case 0 <= start && start <= 43 && end === 52:
          if (44 <= stationIndex && stationIndex <= 51) {
            return "|";
          }
          break;
      }
    }

    if (
      stopStationArray[0] < stationIndex &&
      stationIndex < stopStationArray[stopStationArray.length - 1]
    ) {
      return "↓";
    }

    // 併解結・種別変更マーク

    // 始発駅が発着表示駅の場合
    if (
      this.arrivalChecker(this.stations[start].station_name) &&
      this.departureChecker(this.stations[start].station_name)
    ) {
      // 始発駅
      if (start === stationIndex) {
        if (
          this.trips &&
          this.trips[tripIndex - 1] &&
          trip.trip_block_id === this.trips[tripIndex - 1].trip_block_id
        ) {
          return "⬎";
        }
      }

      if (
        this.arrivalChecker(this.stations[end].station_name) &&
        this.departureChecker(this.stations[end].station_name)
      ) {
        // 終着駅
        if (end === stationIndex) {
          if (
            this.trips &&
            this.trips[tripIndex + 1] &&
            trip.trip_block_id === this.trips[tripIndex + 1].trip_block_id &&
            (_.some(
              this.trips[tripIndex + 1].times,
              time =>
                time.station_id ===
                this.trips[tripIndex].times[
                  this.trips[tripIndex].times.length - 1
                ].station_id
            ) &&
              this.trips[tripIndex].times[
                this.trips[tripIndex].times.length - 1
              ].station_id !==
                this.trips[tripIndex + 1].times[
                  this.trips[tripIndex + 1].times.length - 1
                ].station_id &&
              this.trips[tripIndex].times[
                this.trips[tripIndex].times.length - 1
              ].station_id !== this.trips[tripIndex + 1].times[0].station_id)
          ) {
            return "↳";
          }

          return "=";
        }
      } else {
        if (end === stationIndex - 1) {
          if (
            this.trips &&
            this.trips[tripIndex + 1] &&
            trip.trip_block_id === this.trips[tripIndex + 1].trip_block_id &&
            (_.some(
              this.trips[tripIndex + 1].times,
              time =>
                time.station_id ===
                this.trips[tripIndex].times[
                  this.trips[tripIndex].times.length - 1
                ].station_id
            ) &&
              this.trips[tripIndex].times[
                this.trips[tripIndex].times.length - 1
              ].station_id !==
                this.trips[tripIndex + 1].times[
                  this.trips[tripIndex + 1].times.length - 1
                ].station_id &&
              this.trips[tripIndex].times[
                this.trips[tripIndex].times.length - 1
              ].station_id !== this.trips[tripIndex + 1].times[0].station_id)
          ) {
            return "↳";
          }

          if (
            this.arrivalChecker(this.stations[stationIndex].station_name) &&
            this.departureChecker(this.stations[stationIndex].station_name) &&
            mode !== "arrival"
          ) {
          } else {
            return "=";
          }
        }
      }
    } else {
      // 始発駅
      if (start === stationIndex + 1) {
        console.log(start);
        if (
          this.trips &&
          this.trips[tripIndex - 1] &&
          trip.trip_block_id === this.trips[tripIndex - 1].trip_block_id &&
          (this.trips[tripIndex - 1].times[
            this.trips[tripIndex - 1].times.length - 1
          ].station_id === this.trips[tripIndex].times[0].station_id ||
            _.some(
              this.trips[tripIndex - 1].times,
              time =>
                time.station_id ===
                this.trips[tripIndex].times[
                  this.trips[tripIndex].times.length - 1
                ].station_id
            ))
        ) {
          return "⬎";
        }
      }

      if (
        this.arrivalChecker(this.stations[end].station_name) &&
        this.departureChecker(this.stations[end].station_name)
      ) {
        // 終着駅
        if (end === stationIndex) {
          if (
            this.trips &&
            this.trips[tripIndex + 1] &&
            trip.trip_block_id === this.trips[tripIndex + 1].trip_block_id &&
            (_.some(
              this.trips[tripIndex + 1].times,
              time =>
                time.station_id ===
                this.trips[tripIndex].times[
                  this.trips[tripIndex].times.length - 1
                ].station_id
            ) &&
              this.trips[tripIndex].times[
                this.trips[tripIndex].times.length - 1
              ].station_id !==
                this.trips[tripIndex + 1].times[
                  this.trips[tripIndex + 1].times.length - 1
                ].station_id &&
              this.trips[tripIndex].times[
                this.trips[tripIndex].times.length - 1
              ].station_id !== this.trips[tripIndex + 1].times[0].station_id)
          ) {
            return "↳";
          }

          return "=";
        }
      } else {
        if (end === stationIndex - 1) {
          if (
            this.trips &&
            this.trips[tripIndex + 1] &&
            trip.trip_block_id === this.trips[tripIndex + 1].trip_block_id &&
            (_.some(
              this.trips[tripIndex + 1].times,
              time =>
                time.station_id ===
                this.trips[tripIndex].times[
                  this.trips[tripIndex].times.length - 1
                ].station_id
            ) &&
              this.trips[tripIndex].times[
                this.trips[tripIndex].times.length - 1
              ].station_id !==
                this.trips[tripIndex + 1].times[
                  this.trips[tripIndex + 1].times.length - 1
                ].station_id &&
              this.trips[tripIndex].times[
                this.trips[tripIndex].times.length - 1
              ].station_id !== this.trips[tripIndex + 1].times[0].station_id)
          ) {
            return "↳";
          }

          if (
            this.arrivalChecker(this.stations[stationIndex].station_name) &&
            this.departureChecker(this.stations[stationIndex].station_name) &&
            mode !== "arrival"
          ) {
          } else {
            return "=";
          }
        }
      }
    }

    /*
    // 終着駅の次の駅
    if (
      // 発着両表示
      this.arrivalChecker(
        this.stations[stopStationArray[stopStationArray.length - 1]]
          .station_name
      ) &&
      this.departureChecker(
        this.stations[stopStationArray[stopStationArray.length - 1]]
          .station_name
      )
    ) {
      if (stationIndex === stopStationArray[0]) {
        // 始発駅で前の列車から解結・種別変更
        if (
          this.trips &&
          this.trips[tripIndex - 1] &&
          trip.trip_block_id === this.trips[tripIndex - 1].trip_block_id
        ) {
          return '⬎';
        }
      }

      if (stationIndex === stopStationArray[stopStationArray.length - 1]) {
        // 終着駅で次の列車に併結・種別変更
        if (
          this.trips &&
          this.trips[tripIndex + 1] &&
          trip.trip_block_id === this.trips[tripIndex + 1].trip_block_id
        ) {
          return '↳';
        }

        return '=';
      }
    } else {
      if (
        // 始発駅の前の駅が発着両表示駅の場合
        this.stations[stopStationArray[0] - 1] &&
        this.arrivalChecker(
          this.stations[stopStationArray[0] - 1].station_name
        ) &&
        this.departureChecker(
          this.stations[stopStationArray[0] - 1].station_name
        )
      ) {
        if (stationIndex === stopStationArray[0] - 1 && mode === 'departure') {
          // 始発駅で前の列車から解結・種別変更
          if (
            this.trips &&
            this.trips[tripIndex - 1] &&
            trip.trip_block_id === this.trips[tripIndex - 1].trip_block_id &&
            _.some(
              this.stopStationsArray[tripIndex - 1],
              nextTripStationIndex => stationIndex - 1 === nextTripStationIndex
            )
          ) {
            return '⬎';
          }
        }
      }
      if (
        // 終着駅の次の駅が発着両表示駅の場合
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
          // 終着駅で次の列車に併結・種別変更
          if (
            this.trips &&
            this.trips[tripIndex + 1] &&
            trip.trip_block_id === this.trips[tripIndex + 1].trip_block_id &&
            _.some(
              this.stopStationsArray[tripIndex + 1],
              nextTripStationIndex => stationIndex - 1 === nextTripStationIndex
            )
          ) {
            return '↳';
          }

          return '=';
        }
      } else {
        // 発・着のみ表示駅の場合
        if (stationIndex === stopStationArray[0] - 1) {
          // 始発駅で前の列車から解結・種別変更
          if (
            this.trips &&
            this.trips[tripIndex - 1] &&
            this.trips[tripIndex - 1].times[this.trips[tripIndex - 1].times.length - 1].station_id !== this.trips[0].times[0].station_id &&
            trip.trip_block_id === this.trips[tripIndex - 1].trip_block_id &&
            _.some(
              this.stopStationsArray[tripIndex - 1],
              nextTripStationIndex => stationIndex - 1 === nextTripStationIndex
            )
          ) {
            return '⬎';
          }
        }

        if (
          stationIndex ===
          stopStationArray[stopStationArray.length - 1] + 1
        ) {
          // 終着駅で次の列車に併結・種別変更
          if (
            this.trips &&
            this.trips[tripIndex + 1] &&
            trip.trip_block_id === this.trips[tripIndex + 1].trip_block_id &&
            _.some(
              this.stopStationsArray[tripIndex + 1],
              nextTripStationIndex => stationIndex - 1 === nextTripStationIndex
            )
          ) {
            return '↳';
          }

          return '=';
        }
      }
    }
    */

    return "‥";
  }

  borderCheker(stationName: string) {
    if (this.direction === "up") {
      switch (stationName) {
        case "厚木":
        case "希望ヶ丘":
        case "横浜":
        case "川越":
          return true;
      }
    }
    if (this.direction === "down") {
      switch (stationName) {
        case "羽沢横浜国大":
        case "湘南台":
        case "海老名":
        case "厚木":
          return true;
      }
    }
    return false;
  }
}
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as _ from 'lodash';
import * as moment from 'moment';
import { ApiService } from 'src/app/services/api.service';
import { map, flatMap } from 'rxjs/operators';

@Component({
  selector: 'app-operation-route-diagram',
  templateUrl: './operation-route-diagram.component.html',
  styleUrls: ['./operation-route-diagram.component.scss']
})
export class OperationRouteDiagramComponent implements OnInit {
  calender: any;
  operation: any;
  stations: any[];

  filteredStations: any[];

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.data
      .pipe(
        flatMap(data => {
          console.log(data);
          this.operation = data.operationByOperationId;
          this.stations = data.stations;
          this.filteredStations = this.stationFiltering(this.stations);
          console.log(this.filteredStations);

          return this.api.getCalenderById(this.operation.calender_id);
        })
      )
      .subscribe(data => {
        console.log(data);
        this.calender = data;
      });
  }

  returnTimeString(str: string) {
    return moment(str, 'HH:mm:ss').format('HHmm');
  }

  returnStationIndex(id: string) {
    return _.findIndex(this.filteredStations, obj => {
      return obj.id === id;
    });
  }

  stationFiltering(stations: any[]) {
    const targetStation = [
      '厚木',
      '海老名',
      'かしわ台',
      '相模大塚',
      '大和',
      '瀬谷',
      '湘南台',
      'いずみ野',
      '二俣川',
      '西谷',
      '星川',
      '西横浜',
      '横浜',
      '羽沢横浜国大',
      '大崎',
      '新宿',
      '池袋',
      '板橋',
      '大宮',
      '川越'
    ];
    const result = _.filter(_.reverse(stations), obj => {
      return _.some(targetStation, name => obj.station_name === name);
    });
    return _.map(result, obj => {
      return {
        ...obj,
        station_name:
          obj.station_name === '羽沢横浜国大' ? '羽沢' : obj.station_name
      };
    });
  }

  navigateTimetable(tripId: string, direction: string) {
    this.router.navigate([
      '/timetable/all-line',
      {
        dia: this.calender.id,
        direction: direction,
        trip: tripId
      }
    ]);
  }
}

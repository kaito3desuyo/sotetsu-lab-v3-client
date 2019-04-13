import {
  Component,
  OnInit,
  ViewChild,
  Input,
  AfterContentChecked
} from '@angular/core';
import { MatTableDataSource, MatSort, MatDialog } from '@angular/material';
import { ApiService } from 'src/app/services/api.service';
import * as moment from 'moment';
import * as _ from 'lodash';
import { OperationHistoryDialogComponent } from '../operation-history-dialog/operation-history-dialog.component';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-operation-realtime-by-operation',
  templateUrl: './operation-realtime-by-operation.component.html',
  styleUrls: ['./operation-realtime-by-operation.component.scss']
})
export class OperationRealtimeByOperationComponent
  implements OnInit, AfterContentChecked {
  data: any;
  calender: any;
  stations: any[] = [];
  trips: any[] = [];

  @Input() dataSource = new MatTableDataSource<any>(null);
  displayedColumns: string[] = [
    'operationNumber',
    'formationNumber',
    'history',
    'currentPoint',
    'sightingTime',
    'updateTime'
  ];
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private api: ApiService,
    private dialog: MatDialog,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.data.subscribe(
      (data: { calender: any; stations: any[]; trips: any[] }) => {
        console.log(data);
        this.calender = data.calender;
        this.stations = data.stations;
        this.trips = data.trips;
      }
    );
  }

  ngAfterContentChecked() {
    this.dataSource.sort = this.sort;
  }

  async openHistoryDialog(operationNumber: string) {
    console.log(operationNumber);
    const historyList = await this.api
      .getOperationSightingsByOperationNumber(operationNumber)
      .toPromise();
    this.dialog.open(OperationHistoryDialogComponent, {
      width: '640px',
      data: {
        title: operationNumber + '運の',
        type: 'operation',
        operationNumber: operationNumber
      }
    });
  }

  getCurrentPoint(operationNumber: string) {
    const data = _.find(
      this.trips,
      obj => obj.operation_number === operationNumber
    );

    /**
     * 最初の列車が発車する前
     */
    const firstTripDepartureTime = moment(
      data.trips[0].times[0].departure_time,
      'HH:mm:ss'
    );
    if (
      moment() <
      firstTripDepartureTime.add(
        Number(firstTripDepartureTime.format('H')) < 4 ? 1 : 0
      )
    ) {
      return {
        tripId: '',
        tripDirection: '',
        tripNumber: '',
        tripClass: '',
        tripClassColor: '',
        startStation: _.find(
          this.stations,
          obj => obj.id === data.trips[0].times[0].station_id
        ).station_name,
        startTime: '○',
        endStation: '出庫前',
        endTime: firstTripDepartureTime.format('HHmm')
      };
    }

    /**
     * 現在充当されている列車
     */
    const currentRunningTrain = _.find(data.trips, obj => {
      return (
        moment(obj.times[0].departure_time, 'HH:mm:ss') <= moment() &&
        moment() <
          moment(obj.times[obj.times.length - 1].arrival_time, 'HH:mm:ss')
      );
    });

    if (currentRunningTrain) {
      return {
        tripId: currentRunningTrain.id,
        tripDirection: currentRunningTrain.trip_direction === 0 ? 'up' : 'down',
        tripNumber: currentRunningTrain.trip_number,
        tripClass: currentRunningTrain.trip_class.trip_class_name,
        tripClassColor: currentRunningTrain.trip_class.trip_class_color,
        startStation: _.find(
          this.stations,
          obj => obj.id === currentRunningTrain.times[0].station_id
        ).station_name,
        startTime: moment(
          currentRunningTrain.times[0].departure_time,
          'HH:mm:ss'
        ).format('HHmm'),
        endStation: _.find(
          this.stations,
          obj =>
            obj.id ===
            currentRunningTrain.times[currentRunningTrain.times.length - 1]
              .station_id
        ).station_name,
        endTime: moment(
          currentRunningTrain.times[currentRunningTrain.times.length - 1]
            .arrival_time,
          'HH:mm:ss'
        ).format('HHmm')
      };
    }

    /**
     * 列車と列車の間
     */
    const check = null;
    for (let i = 0; i < data.trips.length; i++) {
      if (data.trips[i - 1]) {
        if (
          moment(
            data.trips[i - 1].times[data.trips[i - 1].times.length - 1]
              .arrival_time,
            'HH:mm:ss'
          ) < moment() &&
          moment() < moment(data.trips[i].times[0].departure_time, 'HH:mm:ss')
        ) {
          return {
            tripId: '',
            tripDirection: '',
            tripNumber: '',
            tripClass: '',
            tripClassColor: '',
            startStation: _.find(this.stations, obj => {
              return (
                obj.id ===
                data.trips[i - 1].times[data.trips[i - 1].times.length - 1]
                  .station_id
              );
            }).station_name,
            startTime: moment(
              data.trips[i - 1].times[data.trips[i - 1].times.length - 1]
                .arrival_time,
              'HH:mm:ss'
            ).format('HHmm'),
            endStation:
              data.trips[i - 1].times[data.trips[i - 1].times.length - 1]
                .depot_in && data.trips[i].times[0].depot_out
                ? '一時入庫'
                : '停車中',
            endTime: moment(
              data.trips[i].times[0].departure_time,
              'HH:mm:ss'
            ).format('HHmm')
          };
        }
      }
    }

    /**
     * 最後の列車が終わったあと
     */
    const finalTripArrivalTime = moment(
      data.trips[data.trips.length - 1].times[
        data.trips[data.trips.length - 1].times.length - 1
      ].arrival_time,
      'HH:mm:ss'
    );
    if (
      finalTripArrivalTime.add(
        Number(finalTripArrivalTime.format('H')) < 4 ? 1 : 0,
        'days'
      ) < moment()
    ) {
      return {
        tripId: '',
        tripDirection: '',
        tripNumber: '',
        tripClass: '',
        tripClassColor: '',
        startStation: _.find(
          this.stations,
          obj =>
            obj.id ===
            data.trips[data.trips.length - 1].times[
              data.trips[data.trips.length - 1].times.length - 1
            ].station_id
        ).station_name,
        startTime: finalTripArrivalTime.format('HHmm'),
        endStation: '入庫済',
        endTime: '△'
      };
    }

    return 'hoge';
  }

  getOperationNumberColor(operationNumber: number) {
    if (!operationNumber) {
      return 'transparent';
    }
    switch (operationNumber[0]) {
      case '1':
        return 'rgba(244,67,54,0.12)';
      case '4':
        return 'rgba(76,175,80,0.12)';
      case '5':
        return 'rgba(33,150,243,0.12)';
      case '6':
        return 'rgba(63,81,181,0.12)';
      default:
        return 'transparent';
    }
  }
}

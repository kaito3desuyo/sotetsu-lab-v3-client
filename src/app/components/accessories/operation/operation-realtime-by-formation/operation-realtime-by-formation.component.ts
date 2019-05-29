import {
  Component,
  OnInit,
  ViewChild,
  Input,
  AfterContentChecked,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  AfterContentInit
} from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { MatTableDataSource, MatSort, MatDialog } from '@angular/material';
import * as moment from 'moment';
import * as _ from 'lodash';
import { OperationHistoryDialogComponent } from '../operation-history-dialog/operation-history-dialog.component';
import { SocketService } from 'src/app/services/socket.service';
import { ActivatedRoute } from '@angular/router';
import { Subscription, interval, Observable } from 'rxjs';
import { map, flatMap } from 'rxjs/operators';
import { GlobalFunctionService } from 'src/app/services/global-function.service';

@Component({
  selector: 'app-operation-realtime-by-formation',
  templateUrl: './operation-realtime-by-formation.component.html',
  styleUrls: ['./operation-realtime-by-formation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationRealtimeByFormationComponent
  implements OnInit, OnDestroy {
  data: any;
  calender: any;
  stations: any[] = [];
  trips: any[] = [];
  currentPoints: any = {};
  colors: any = {};
  subscriptions: Subscription[] = [];

  @Input() dataSourceObservable: Observable<MatTableDataSource<any>>;
  dataSource = new MatTableDataSource<any>();
  displayedColumns: string[] = [
    'formationNumber',
    'operationNumber',
    'history',
    'currentPoint',
    'sightingTime',
    'updateTime'
  ];
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private api: ApiService,
    private globalFunction: GlobalFunctionService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const dataSub = this.dataSourceObservable.subscribe(data => {
      this.dataSource = data;
      this.dataSource.sort = this.sort;
      this.cd.markForCheck();
    });

    this.subscriptions.push(dataSub);

    const initSub = this.route.data
      .pipe(
        map(data => {
          this.calender = data.calender;
          this.stations = data.stations;
        }),
        flatMap(data => {
          return this.api.getTripsGroupByOperations({
            calender_id: this.calender.id
          });
        }),
        map(data => {
          this.trips = data;

          this.currentPoints = {};
          _.forEach(this.trips, obj => {
            this.currentPoints[obj.operation_number] = {
              ...this.getCurrentPoint(obj)
            };
            this.colors[
              obj.operation_number
            ] = this.globalFunction.returnOperationNumberColor(
              obj.operation_number
            );
          });
          this.cd.detectChanges();
        }),
        flatMap(data =>
          interval(1000 * 10).pipe(
            map(() => {
              this.currentPoints = {};
              _.forEach(this.trips, obj => {
                this.currentPoints[obj.operation_number] = {
                  ...this.getCurrentPoint(obj)
                };
              });
              this.cd.detectChanges();
            })
          )
        )
      )
      .subscribe(() => console.log('現在地を更新'));

    this.subscriptions.push(initSub);
  }

  async openHistoryDialog(formationNumber: string) {
    console.log(this.dataSource);

    const formation = await this.api
      .getFormationByNumber(formationNumber)
      .toPromise();

    this.dialog.open(OperationHistoryDialogComponent, {
      width: '640px',
      data: {
        title:
          formationNumber + '×' + formation[0].vehicle_formations.length + 'の',
        type: 'formation',
        formationNumber: formationNumber
      }
    });
  }

  returnCurrentPoint(operationNumber: number) {
    return _.find(
      this.currentPoints,
      obj => obj.operationNumber === operationNumber
    );
  }

  getCurrentPoint(data: any) {
    /**
     * 現在充当されている列車
     */
    const currentRunningTrain = _.find(data.trips, obj => {
      return (
        moment(obj.times[0].departure_time, 'HH:mm:ss').subtract(
          moment(obj.times[0].departure_time, 'HH:mm:ss') >
            moment(obj.times[obj.times.length - 1].arrival_time, 'HH:mm:ss')
            ? 1
            : 0,
          'days'
        ) <= moment() &&
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

    if (Number(moment().format('H')) >= 4) {
      /**
       * 最初の列車が発車する前
       */
      const firstTripDepartureTime = moment(
        data.trips[0].times[0].departure_time,
        'HH:mm:ss'
      ).subtract(
        Number(moment().format('H')) < 4 &&
          Number(
            moment(data.trips[0].times[0].departure_time, 'HH:mm:ss').format(
              'H'
            )
          ) >= 4
          ? 1
          : 0,
        'days'
      );

      if (moment() < firstTripDepartureTime) {
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
    }

    /**
     * 最後の列車が終わったあと
     */
    const finalTripArrivalTime = moment(
      data.trips[data.trips.length - 1].times[
        data.trips[data.trips.length - 1].times.length - 1
      ].arrival_time,
      'HH:mm:ss'
    ).subtract(
      Number(moment().format('H')) < 4 &&
        Number(
          moment(
            data.trips[data.trips.length - 1].times[
              data.trips[data.trips.length - 1].times.length - 1
            ].arrival_time,
            'HH:mm:ss'
          ).format('H')
        ) >= 4
        ? 1
        : 0,
      'days'
    );

    if (finalTripArrivalTime < moment()) {
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

    return {};
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

  isIncrementData(date: string) {
    return moment(date).format('H') === '2';
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => {
      sub.unsubscribe();
    });
  }
}

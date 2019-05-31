import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import * as moment from 'moment';
import * as _ from 'lodash';
import { interval, Subscription, BehaviorSubject, throwError } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { MatTableDataSource, MatSnackBar } from '@angular/material';
import { SocketService } from 'src/app/services/socket.service';
import { LoadingService } from 'src/app/services/loading.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-real-time',
  templateUrl: './real-time.component.html',
  styleUrls: ['./real-time.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RealTimeComponent implements OnInit, OnDestroy {
  subscriptions: Subscription[] = [];

  nowDateTime: string;
  finalUpdateTime: string;

  formationTableDataSource = new BehaviorSubject(new MatTableDataSource<any>());
  operationTableDataSource = new BehaviorSubject(new MatTableDataSource<any>());

  constructor(
    private api: ApiService,
    private socketService: SocketService,
    private snackBar: MatSnackBar,
    private loading: LoadingService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const timerSub = interval(1000).subscribe(result => {
      this.nowDateTime = this.getNowDateTime();
      this.cd.detectChanges();
    });

    this.loadTableData();

    this.socketService.connect('');
    const connectionSub = this.socketService
      .on('reload_operation_sighting')
      .subscribe(async data => {
        console.log('運用情報を更新してください');
        await this.loadTableData();
        this.snackBar.open('最新の運用情報を取得しました。', 'OK', {
          duration: 3000
        });
      });

    this.subscriptions.push(timerSub, connectionSub);
  }

  getNowDateTime() {
    return moment().format('YYYY年MM月DD日 HH:mm:ss');
  }

  async onSendSighting() {
    console.log('データが送信されました');
    await this.loadTableData();
    this.cd.detectChanges();
  }

  loadTableData() {
    this.loading.open();

    this.getOperationSightingByFormation(),
      this.getOperationSightingByOperation();

    this.finalUpdateTime = this.getNowDateTime();
    this.cd.detectChanges();
    this.loading.close();
  }

  getOperationSightingByFormation() {
    this.api.getOperationSightingsByFormation().subscribe(data => {
      const tableData = this.generateTableData(data, 'formation');
      console.log('編成', tableData);
      this.formationTableDataSource.next(new MatTableDataSource<any>(tableData));
    });
  }

  getOperationSightingByOperation() {
    this.api.getOperationSightingsByOperation().subscribe(data => {
      const tableData = this.generateTableData(data, 'operation');
      console.log('運用', tableData);
      this.operationTableDataSource.next(new MatTableDataSource<any>(tableData));
    });
  }

  generateTableData(data: any, mode: string) {
    if (mode === 'formation') {
      const tableData = _.map(data, element => {
        return {
          formationNumber: element.formation_number,
          operationId: element.operation_id,
          operationNumber: element.operation_number,
          sightingTime: element.sighting_time,
          updateTime: element.updated_at
        };
      });

      tableData.forEach(element => {
        /*
        element.operationNumber = this.searchSameOperationNumber(
          element,
          tableData
        )
          ? '不明'
          : element.operationNumber;
          */
        element.operationNumber =
          element.operationNumber === '100'
            ? '休車'
            : element.operationNumber === null
            ? '不明'
            : element.operationNumber;
      });

      return tableData;
    }

    if (mode === 'operation') {
      const tableData = _(data)
        .filter(element => {
          return element.operation_number !== null;
        })
        .map(element => {
          return {
            formationNumber: element.formation_number,
            operationId: element.operation_id,
            operationNumber: element.operation_number,
            sightingTime: element.sighting_time,
            updateTime: element.updated_at
          };
        })
        .map((element, index, allData) => {
          return {
            ...element,
            formationNumber:
              this.searchSameFormationNumber(element, allData) ||
              element.formationNumber === null
                ? '不明'
                : element.formationNumber
          };
        })
        .sortBy([
          element => {
            return element.operationNumber;
          }
        ])
        .value();

      /*
      tableData = _.filter(tableData, element => {
        return !this.searchSameOperationNumber(element, tableData);
      });

      tableData = _.map(this.operations, obj => {
        const targetSighting = _.find(
          tableData,
          element => obj.operation_number === element.operationNumber
        );
        if (targetSighting) {
          return targetSighting;
        } else {
          return {
            formationNumber: '不明',
            operationId: obj.id,
            operationNumber: obj.operation_number,
            sightingTime: null,
            updateTime: null
          };
        }
      });
      */

      return tableData;
    }

    return [];
  }

  searchSameFormationNumber(element, allData) {
    const checker = _.filter(allData, obj => {
      return (
        obj.formationNumber === element.formationNumber &&
        obj.updateTime > element.updateTime
      );
    });

    return checker.length !== 0;
  }

  searchSameOperationNumber(element, allData) {
    const checker = _.filter(allData, obj => {
      return (
        obj.operationNumber === element.operationNumber &&
        obj.updateTime > element.updateTime
      );
    });

    return checker.length !== 0;
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => {
      sub.unsubscribe();
    });
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import * as moment from 'moment';
import * as _ from 'lodash';
import { interval, Subscription } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { MatTableDataSource, MatSnackBar } from '@angular/material';
import { SocketService } from 'src/app/services/socket.service';
import { LoadingService } from 'src/app/services/loading.service';

@Component({
  selector: 'app-real-time',
  templateUrl: './real-time.component.html',
  styleUrls: ['./real-time.component.scss']
})
export class RealTimeComponent implements OnInit, OnDestroy {
  subscriptions: Subscription[] = [];

  nowDateTime: Date;
  finalUpdateTime: Date;

  formationTableDataSource = new MatTableDataSource<any>();
  operationTableDataSource = new MatTableDataSource<any>();

  constructor(
    private api: ApiService,
    private socketService: SocketService,
    private snackBar: MatSnackBar,
    private loading: LoadingService
  ) {}

  ngOnInit() {
    const timerSub = interval(1000).subscribe(result => {
      this.nowDateTime = this.getNowDateTime();
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
    return moment().toDate();
  }

  async onSendSighting() {
    console.log('データが送信されました');
    // await this.loadTableData();
  }

  async loadTableData() {
    this.loading.open();
    await Promise.all([
      this.getOperationSightingByFormation(),
      this.getOperationSightingByOperation()
    ]);
    this.finalUpdateTime = this.getNowDateTime();
    this.loading.close();
  }

  async getOperationSightingByFormation() {
    const apiData = await this.api
      .getOperationSightingsByFormation()
      .toPromise();
    const tableData = this.generateTableData(apiData, 'formation');
    console.log('編成', tableData);
    this.formationTableDataSource = new MatTableDataSource<any>(tableData);
  }

  async getOperationSightingByOperation() {
    const apiData = await this.api
      .getOperationSightingsByOperation()
      .toPromise();
    const tableData = this.generateTableData(apiData, 'operation');
    this.operationTableDataSource = new MatTableDataSource<any>(tableData);
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
        element.operationNumber = this.searchSameOperationNumber(
          element,
          tableData
        )
          ? '不明'
          : element.operationNumber;
        element.operationNumber =
          element.operationNumber === '100' ? '休車' : element.operationNumber;
      });

      return tableData;
    }

    if (mode === 'operation') {
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
        element.formationNumber = this.searchSameFormationNumber(
          element,
          tableData
        )
          ? '不明'
          : element.formationNumber;
      });

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

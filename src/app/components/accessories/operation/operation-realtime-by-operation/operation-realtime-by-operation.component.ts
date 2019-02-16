import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource, MatSort, MatDialog } from '@angular/material';
import { ApiService } from 'src/app/services/api.service';
import * as moment from 'moment';
import * as _ from 'lodash';
import { OperationHistoryDialogComponent } from '../operation-history-dialog/operation-history-dialog.component';

@Component({
  selector: 'app-operation-realtime-by-operation',
  templateUrl: './operation-realtime-by-operation.component.html',
  styleUrls: ['./operation-realtime-by-operation.component.scss']
})
export class OperationRealtimeByOperationComponent implements OnInit {
  data: any;

  dataSource = new MatTableDataSource<any>(null);
  displayedColumns: string[] = [
    'operationNumber',
    'formationNumber',
    'history',
    'sightingTime',
    'updateTime'
  ];
  @ViewChild(MatSort) sort: MatSort;

  constructor(private api: ApiService, private dialog: MatDialog) {}

  ngOnInit() {
    this.getOperationSightingData();
  }

  getOperationSightingData() {
    this.api.getOperationByDate(moment().format('YYYYMMDD')).subscribe(data => {
      this.generateTableData(data);
    });
  }

  generateTableData(data: any) {
    console.log(data);
    this.data = data;
    const tableData = [];
    data.forEach(element => {
      tableData.push({
        formationNumber: element.operation_sightings[0]
          ? element.operation_sightings[0].formation.formation_number
          : null,
        operationNumber: element.operation_number,
        sightingTime: element.operation_sightings[0]
          ? element.operation_sightings[0].sighting_time
          : null,
        updateTime: element.operation_sightings[0]
          ? element.operation_sightings[0].updated_at
          : null
      });
    });

    tableData.forEach(element => {
      element.formationNumber = this.searchSameFormationNumber(
        element,
        tableData
      )
        ? '不明'
        : element.formationNumber;
    });

    this.dataSource = new MatTableDataSource<any>(tableData);
    this.dataSource.sort = this.sort;
  }

  searchSameFormationNumber(element, allData) {
    const checker = _.filter(allData, obj => {
      return (
        obj.formationNumber === element.formationNumber &&
        obj.sightingTime > element.sightingTime
      );
    });
    console.log(checker);
    return checker.length !== 0;
  }

  openHistoryDialog(operationNumber: string) {
    console.log(operationNumber);
    const historyList = _.find(this.data, obj => {
      return obj.operation_number === operationNumber;
    }).operation_sightings;
    this.dialog.open(OperationHistoryDialogComponent, {
      width: '640px',
      data: {
        title: operationNumber + '運の',
        type: 'operation',
        historyList: historyList
      }
    });
  }
}

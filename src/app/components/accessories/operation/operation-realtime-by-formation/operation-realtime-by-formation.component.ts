import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { MatTableDataSource, MatSort, MatDialog } from '@angular/material';
import * as moment from 'moment';
import * as _ from 'lodash';
import { OperationHistoryDialogComponent } from '../operation-history-dialog/operation-history-dialog.component';

@Component({
  selector: 'app-operation-realtime-by-formation',
  templateUrl: './operation-realtime-by-formation.component.html',
  styleUrls: ['./operation-realtime-by-formation.component.scss']
})
export class OperationRealtimeByFormationComponent implements OnInit {
  data: any;

  dataSource = new MatTableDataSource<any>(null);
  displayedColumns: string[] = [
    'formationNumber',
    'operationNumber',
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
    this.api.getFormation().subscribe(data => {
      this.generateTableData(data);
    });
  }

  generateTableData(data: any) {
    console.log(data);
    this.data = data;
    const tableData = [];
    data.forEach(element => {
      tableData.push({
        formationNumber: element.formation_number,
        operationNumber: element.operation_sightings[0]
          ? element.operation_sightings[0].operation.operation_number
          : null,
        sightingTime: element.operation_sightings[0]
          ? element.operation_sightings[0].sighting_time
          : null,
        updateTime: element.operation_sightings[0]
          ? element.operation_sightings[0].updated_at
          : null
      });
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

    this.dataSource = new MatTableDataSource<any>(tableData);
    this.dataSource.sort = this.sort;
  }

  searchSameOperationNumber(element, allData) {
    console.log('データ', element, allData);
    const checker = _.filter(allData, obj => {
      return (
        obj.operationNumber === element.operationNumber &&
        obj.sightingTime > element.sightingTime
      );
    });
    console.log(checker);
    return checker.length !== 0;
  }

  openHistoryDialog(formationNumber: string) {
    const historyList = _.find(this.data, obj => {
      return obj.formation_number === formationNumber;
    }).operation_sightings;
    const length = _.find(this.data, obj => {
      return obj.formation_number === formationNumber;
    }).vehicle_formations.length;
    this.dialog.open(OperationHistoryDialogComponent, {
      width: '640px',
      data: {
        title: formationNumber + '×' + length + 'の',
        type: 'formation',
        historyList: historyList
      }
    });
  }
}

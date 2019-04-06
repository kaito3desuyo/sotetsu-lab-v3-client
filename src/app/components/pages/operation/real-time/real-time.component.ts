import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import * as _ from 'lodash';
import { interval } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { MatTableDataSource } from '@angular/material';

@Component({
  selector: 'app-real-time',
  templateUrl: './real-time.component.html',
  styleUrls: ['./real-time.component.scss']
})
export class RealTimeComponent implements OnInit {
  nowDateTime: Date;

  formationTableDataSource = new MatTableDataSource<any>();
  operationTableDataSource = new MatTableDataSource<any>();

  constructor(private api: ApiService) {}

  ngOnInit() {
    // interval(1000).subscribe(result => {
    this.getNowDateTime();
    // });
    this.getOperationSightingByFormation();
    this.getOperationSightingByOperation();
  }

  getNowDateTime() {
    this.nowDateTime = moment().toDate();
  }

  onSendSighting() {
    console.log('データが送信されました');
    this.getOperationSightingByFormation();
    this.getOperationSightingByOperation();
  }

  getOperationSightingByFormation() {
    this.api.getFormation().subscribe(async data => {
      const tableData = await this.generateTableData(data, 'formation');
      console.log('編成', tableData);
      this.formationTableDataSource = new MatTableDataSource<any>(tableData);
    });
  }

  getOperationSightingByOperation() {
    this.api
      .getOperationByDate(moment().format('YYYYMMDD'))
      .subscribe(async data => {
        const tableData = await this.generateTableData(data, 'operation');
        this.operationTableDataSource = new MatTableDataSource<any>(tableData);
      });
  }

  async generateTableData(data: any, mode: string) {
    if (mode === 'formation') {
      const tableDataPromise = _.map(data, async element => {
        const sightings = await this.api
          .getOperationSightingsByFormationNumber(element.formation_number)
          .toPromise();

        return {
          formationNumber: element.formation_number,
          length: element.vehicle_formations.length,
          operationNumber: sightings.rows[0]
            ? sightings.rows[0].operation.operation_number
            : null,
          sightingTime: sightings.rows[0]
            ? sightings.rows[0].sighting_time
            : null,
          updateTime: sightings.rows[0] ? sightings.rows[0].updatedAt : null
        };
      });

      const tableData = await Promise.all(tableDataPromise);

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
      const tableDataPromise = _.map(data, async element => {
        const sightings = await this.api
          .getOperationSightingsByOperationNumber(element.operation_number)
          .toPromise();
        return {
          formationNumber: sightings.rows[0]
            ? sightings.rows[0].formation.formation_number
            : null,
          // length: element.vehicle_formations.length,
          operationNumber: element.operation_number,
          sightingTime: sightings.rows[0]
            ? sightings.rows[0].sighting_time
            : null,
          updateTime: sightings.rows[0] ? sightings.rows[0].updatedAt : null
        };
      });

      const tableData = await Promise.all(tableDataPromise);

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
        obj.sightingTime > element.sightingTime
      );
    });

    return checker.length !== 0;
  }

  searchSameOperationNumber(element, allData) {
    const checker = _.filter(allData, obj => {
      return (
        obj.operationNumber === element.operationNumber &&
        obj.sightingTime > element.sightingTime
      );
    });

    return checker.length !== 0;
  }
}

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
import { interval } from 'rxjs';

@Component({
  selector: 'app-operation-realtime-by-operation',
  templateUrl: './operation-realtime-by-operation.component.html',
  styleUrls: ['./operation-realtime-by-operation.component.scss']
})
export class OperationRealtimeByOperationComponent
  implements OnInit, AfterContentChecked {
  data: any;

  @Input() dataSource = new MatTableDataSource<any>(null);
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
    // interval(1000 * 10).subscribe(result => {
    // this.getOperationSightingData();
    // });
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
}

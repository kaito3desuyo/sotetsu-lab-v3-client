import {
  Component,
  OnInit,
  ViewChild,
  Input,
  AfterContentChecked
} from '@angular/core';
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
export class OperationRealtimeByFormationComponent
  implements OnInit, AfterContentChecked {
  data: any;

  @Input() dataSource = new MatTableDataSource<any>(null);
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
    // this.getOperationSightingData();
  }

  ngAfterContentChecked() {
    this.dataSource.sort = this.sort;
  }

  async openHistoryDialog(formationNumber: string) {
    console.log(this.dataSource);
    const historyList = await this.api
      .getOperationSightingsByFormationNumber(formationNumber)
      .toPromise();
    const length = _.find(this.dataSource.data, obj => {
      return obj.formationNumber === formationNumber;
    }).length;

    this.dialog.open(OperationHistoryDialogComponent, {
      width: '640px',
      data: {
        title: formationNumber + '×' + length + 'の',
        type: 'formation',
        formationNumber: formationNumber
      }
    });
  }
}

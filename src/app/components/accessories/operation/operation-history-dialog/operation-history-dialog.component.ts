import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-operation-history-dialog',
  templateUrl: './operation-history-dialog.component.html',
  styleUrls: ['./operation-history-dialog.component.scss']
})
export class OperationHistoryDialogComponent implements OnInit {
  displayedColumns = ['sightingTime', 'updatedAt'];
  dataSource: MatTableDataSource<any> = new MatTableDataSource<any>();

  @ViewChild(MatPaginator) paginator: MatPaginator;
  constructor(
    public dialogRef: MatDialogRef<OperationHistoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private api: ApiService
  ) {}

  ngOnInit() {
    switch (this.data.type) {
      case 'formation':
        this.displayedColumns.unshift('operationNumber');
        break;
      case 'operation':
        this.displayedColumns.unshift('formationNumber');
        break;
    }
    this.getHistoryData();
  }

  async getHistoryData(limit: number = 5, offset: number = 0) {
    if (this.data.type === 'formation') {
      const historyList = await this.api
        .getOperationSightingsByFormationNumber(this.data.formationNumber, {
          limit: String(limit),
          offset: String(offset)
        })
        .toPromise();
      this.dataSource = new MatTableDataSource<any>(historyList.rows);
      this.paginator.length = historyList.count;
    }
    if (this.data.type === 'operation') {
      const historyList = await this.api
        .getOperationSightingsByOperationNumber(this.data.operationNumber, {
          limit: String(limit),
          offset: String(offset)
        })
        .toPromise();
      this.dataSource = new MatTableDataSource<any>(historyList.rows);
      this.paginator.length = historyList.count;
      this.paginator.pageSize = limit;
      this.paginator.pageIndex = offset;
    }
  }

  paging(event) {
    console.log(event);
    this.getHistoryData(event.pageSize, event.pageIndex);
  }

  onCancel() {
    this.dialogRef.close();
  }
}

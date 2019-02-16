import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'app-operation-history-dialog',
  templateUrl: './operation-history-dialog.component.html',
  styleUrls: ['./operation-history-dialog.component.scss']
})
export class OperationHistoryDialogComponent implements OnInit {
  displayedColumns = ['sightingTime', 'updatedAt'];
  constructor(
    public dialogRef: MatDialogRef<OperationHistoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
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
  }

  onCancel() {
    this.dialogRef.close();
  }
}

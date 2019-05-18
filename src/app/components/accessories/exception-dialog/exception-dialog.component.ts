import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

export interface ExceptionDialogData {
  title: string;
  text: string;
}

@Component({
  selector: 'app-exception-dialog',
  templateUrl: './exception-dialog.component.html',
  styleUrls: ['./exception-dialog.component.scss']
})
export class ExceptionDialogComponent implements OnInit {
  constructor(
    public dialogRef: MatDialogRef<ExceptionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ExceptionDialogData
  ) {}

  ngOnInit() {}

  onClickOk() {
    console.log('ダイアログ閉じる');
    this.dialogRef.close();
  }
}

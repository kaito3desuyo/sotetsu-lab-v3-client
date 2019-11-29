import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { IConfirmDialogData } from '../../interfaces/confirm-dialog-data.interface';

@Component({
    selector: 'app-confirm-dialog-container',
    templateUrl: './confirm-dialog-container.component.html',
    styleUrls: ['./confirm-dialog-container.component.scss']
})
export class ConfirmDialogContainerComponent implements OnInit {
    constructor(
        public dialogRef: MatDialogRef<ConfirmDialogContainerComponent>,
        @Inject(MAT_DIALOG_DATA)
        public data: IConfirmDialogData
    ) {}

    ngOnInit() {}

    onReceiveClickButton(bool: boolean) {
        this.dialogRef.close(bool);
    }
}

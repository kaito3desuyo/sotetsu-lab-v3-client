import { Injectable } from '@angular/core';
import {
    MatDialog,
    MatDialogConfig,
    MatDialogRef,
} from '@angular/material/dialog';
import extend from 'just-extend';
import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';
import { IConfirmDialogData } from '../interfaces/confirm-dialog-data.interface';

@Injectable()
export class ConfirmDialogService {
    private _dialogRef: MatDialogRef<ConfirmDialogComponent>;

    constructor(private readonly dialog: MatDialog) {}

    open(
        config?: MatDialogConfig<IConfirmDialogData>,
    ): MatDialogRef<ConfirmDialogComponent> {
        const defaultConfig: MatDialogConfig<IConfirmDialogData> = {
            width: '360px',
            autoFocus: false,
            disableClose: true,
        };

        this._dialogRef = this.dialog.open<
            ConfirmDialogComponent,
            IConfirmDialogData,
            boolean
        >(ConfirmDialogComponent, extend(true, defaultConfig, config));

        return this._dialogRef;
    }

    close(bool = false): void {
        this._dialogRef.close(bool);
    }
}

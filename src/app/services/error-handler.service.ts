import { Injectable, ErrorHandler, NgZone, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material';
import { ExceptionDialogComponent } from '../components/accessories/exception-dialog/exception-dialog.component';
import { Location } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService implements ErrorHandler {
  constructor(
    private zone: NgZone,
    private dialog: MatDialog,
    private location: Location
  ) {}

  handleError(error: any) {
    console.error('ERROR', error);

    this.zone.run(() => {
      const dialogRef = this.dialog.open(ExceptionDialogComponent, {
        data: {
          title: 'エラーが発生しました',
          text: error.message
        }
      });

      dialogRef.afterClosed().subscribe(done => {
        // this.location.back();
      });
    });
  }
}

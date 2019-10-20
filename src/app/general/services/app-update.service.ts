import { Injectable, Inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogContainerComponent } from '../components/confirm-dialog-container/confirm-dialog-container.component';

@Injectable({
  providedIn: 'root'
})
export class AppUpdateService {
  constructor(updates: SwUpdate, dialog: MatDialog) {
    // console.log('App Update Service');
    updates.available.subscribe(event => {
      /*
      console.log('current version is', event.current);
      console.log('available version is', event.available);
      */

      const dialogRef = dialog.open(ConfirmDialogContainerComponent, {
        data: {
          title: '新しいバージョン',
          text: 'アプリに新しいバージョンがあります。今すぐ更新しますか？',
          goButtonText: '更新する',
          goButtonColor: 'primary',
          cancelButtonText: 'キャンセル'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          updates.activateUpdate().then(() => document.location.reload());
        }
      });
    });
    /*
    updates.activated.subscribe(event => {
      console.log('old version was', event.previous);
      console.log('new version is', event.current);
    });
    */
  }
}

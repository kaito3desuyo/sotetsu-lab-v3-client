import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogContainerComponent } from 'src/app/general/components/confirm-dialog-container/confirm-dialog-container.component';
import { SocketService } from 'src/app/general/services/socket.service';
import { NGXLogger } from 'ngx-logger';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  constructor(
    private dialog: MatDialog,
    private socketService: SocketService
  ) {}

  ngOnInit() {
    this.socketService.connect('/operation/real-time');
    this.socketService.on('test').subscribe(data => {
      console.log(data);
    });
  }

  openDialogTest() {
    this.socketService.emit('test', 'test');
    const dialogRef = this.dialog.open(ConfirmDialogContainerComponent, {
      width: '640px',
      data: {
        title: '更新',
        text: '更新しますか？',
        goButtonText: '更新する',
        goButtonColor: 'warn',
        cancelButtonText: 'キャンセル'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log(result);
    });
  }
}

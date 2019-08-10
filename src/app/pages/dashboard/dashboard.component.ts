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
    this.socketService.on('sightingReload').subscribe(data => {
      console.log(data);
    });
  }

  openDialogTest() {
    this.socketService.emit('sendSighting', { operationNumber: 45 });
  }
}

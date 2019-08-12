import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SocketService } from 'src/app/general/services/socket.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  constructor(
    private dialog: MatDialog,
    private socketService: SocketService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.socketService.connect('/operation/real-time');
    this.socketService.on('sightingReload').subscribe(data => {
      console.log(data);
    });
    this.route.data.subscribe(result => {
      console.log(result);
    });
  }

  openDialogTest() {
    this.socketService.emit('sendSighting', { operationNumber: 45 });
  }
}

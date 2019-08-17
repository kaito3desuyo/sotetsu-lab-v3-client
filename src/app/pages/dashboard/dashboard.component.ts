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
  date: string;

  constructor(
    private route: ActivatedRoute,
    private socketService: SocketService
  ) {}

  ngOnInit() {
    this.socketService.connect('/operation/real-time');
    this.route.data.subscribe((data: { date: string }) => {
      this.date = data.date;
    });
  }

  onReceiveSubmitSighting(result: any): void {
    this.socketService.emit('sendSighting', result);
  }

  openDialogTest() {}
}

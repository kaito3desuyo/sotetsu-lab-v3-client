import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SocketService } from 'src/app/general/services/socket.service';
import { ActivatedRoute } from '@angular/router';
import { ParamsQuery } from 'src/app/state/params';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  date: string;

  constructor(
    private route: ActivatedRoute,
    private socketService: SocketService,
    private paramsQuery: ParamsQuery
  ) {}

  ngOnInit() {
    this.socketService.connect('/operation/real-time');
    this.route.data.subscribe((data: { date: string }) => {
      this.date = data.date;
    });
    this.paramsQuery.select('calendarId').subscribe(data => {
      console.log(data);
    });
  }

  onReceiveSubmitSighting(result: any): void {
    this.socketService.emit('sendSighting', result);
  }

  openDialogTest() {}
}

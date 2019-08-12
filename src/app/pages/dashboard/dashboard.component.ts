import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogContainerComponent } from 'src/app/general/components/confirm-dialog-container/confirm-dialog-container.component';
import { SocketService } from 'src/app/general/services/socket.service';
import { NGXLogger } from 'ngx-logger';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { flatMap } from 'rxjs/operators';
import { CurrentParamsQuery } from 'src/app/general/models/current-params/current-params.query';
import { CurrentParamsService } from 'src/app/general/models/current-params/current-params.service';
import { CalendersService } from 'src/app/general/models/calenders/state/calenders.service';
import { CalendersQuery } from 'src/app/general/models/calenders/state/calenders.query';
import { CalenderModel } from 'src/app/general/models/calenders/calender-model';

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

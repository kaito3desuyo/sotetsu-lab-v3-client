import { Component, OnInit, Inject, Injector } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import { BaseComponent } from 'src/app/general/classes/base-component';
import { OperationRealTimeService } from '../general/services/operation-real-time.service';
import { SocketService } from 'src/app/general/services/socket.service';

@Component({
  selector: 'app-operation-real-time',
  templateUrl: './operation-real-time.component.html',
  styleUrls: ['./operation-real-time.component.scss']
})
export class OperationRealTimeComponent extends BaseComponent {
  date: string;

  constructor(
    @Inject(Injector) injector: Injector,
    private route: ActivatedRoute,
    private router: Router,
    private socketService: SocketService,
    private operationRealTimeService: OperationRealTimeService
  ) {
    super(injector);
    this.socketService.connect('/operation/real-time');
    this.subscription = this.socketService
      .on('sightingReload')
      .subscribe(data => {
        if (data.eventType === 'receive') {
          this.notification.open('データが更新されました', 'OK');
        }
        this.router.navigate([this.router.url]);
      });
    this.subscription = this.route.data.subscribe((data: { date: string }) => {
      console.log(data);
      this.date = data.date;
    });

    this.operationRealTimeService
      .generateOperationTripsTableData()
      .subscribe(trips => {
        console.log('trips', trips);
      });
  }

  onReceiveSubmitSighting(result: any): void {
    this.socketService.emit('sendSighting', result);
  }
}
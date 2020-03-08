import { Component, Inject, Injector, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from 'src/app/general/classes/base-component';
import { SocketService } from 'src/app/general/services/socket.service';
import { TitleService } from 'src/app/general/services/title.service';
import { OperationRealTimeService } from './general/services/operation-real-time.service';

@Component({
    selector: 'app-operation-real-time',
    templateUrl: './operation-real-time.component.html',
    styleUrls: ['./operation-real-time.component.scss']
})
export class OperationRealTimeComponent extends BaseComponent
    implements OnInit, OnDestroy {
    date: string;

    constructor(
        @Inject(Injector) injector: Injector,
        private route: ActivatedRoute,
        private socketService: SocketService,
        private titleService: TitleService,
        private operationRealTimeService: OperationRealTimeService
    ) {
        super(injector);
        this.subscription = this.route.data.subscribe(
            (data: { date: string; title: string }) => {
                this.date = data.date;
                this.titleService.setTitle(data.title);
            }
        );
    }

    ngOnInit(): void {
        this.operationRealTimeService.startSocketReceive();
    }

    onReceiveSubmitSighting(result: any): void {
        this.socketService.emit('sendSighting', result);
    }

    ngOnDestroy(): void {
        this.operationRealTimeService.stopSocketReceive();
    }
}

import { Component, Inject, Injector } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from 'src/app/general/classes/base-component';
import { SocketService } from 'src/app/general/services/socket.service';
import { TitleService } from 'src/app/general/services/title.service';

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
        private socketService: SocketService,
        private titleService: TitleService
    ) {
        super(injector);
        this.subscription = this.route.data.subscribe(
            (data: { date: string; title: string }) => {
                this.date = data.date;
                this.titleService.setTitle(data.title);
            }
        );
    }

    onReceiveSubmitSighting(result: any): void {
        this.socketService.emit('sendSighting', result);
    }
}

import { Component } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from 'src/app/core/services/notification.service';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { IOperationPostCardForm } from '../../interfaces/operation-post-card-form.interface';
import { OperationPostCardService } from '../../services/operation-post-card.service';

@Component({
    selector: 'app-operation-post-card-c',
    templateUrl: './operation-post-card-c.component.html',
    styleUrls: ['./operation-post-card-c.component.scss'],
})
export class OperationPostCardCComponent {
    readonly agencies$ = this.agencyListStateQuery.agencies$;
    readonly submitOperationSightingEvent$ =
        this.operationPostCardService.receiveSubmitOperationSightingEvent();

    constructor(
        private readonly logger: NGXLogger,
        private readonly notification: NotificationService,
        private readonly agencyListStateQuery: AgencyListStateQuery,
        private readonly operationPostCardService: OperationPostCardService
    ) {}

    onReceiveSubmitSighting(formValue: IOperationPostCardForm): void {
        this.operationPostCardService
            .addOperationSighting(formValue)
            .subscribe({
                complete: () => {
                    this.notification.open('目撃情報を送信しました', 'OK');
                },
                error: (e) => {
                    this.logger.error(e.message);
                    this.notification.open(e.message, 'OK');
                },
            });
    }
}

import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { LoadingService } from 'src/app/shared/app-shared/loading/loading.service';
import { IOperationPostCardForm } from '../../interfaces/operation-post-card-form.interface';
import { OperationPostCardService } from '../../services/operation-post-card.service';
import { OperationPostCardPComponent } from '../operation-post-card-p/operation-post-card-p.component';

@Component({
    standalone: true,
    selector: 'app-operation-post-card-c',
    templateUrl: './operation-post-card-c.component.html',
    styleUrls: ['./operation-post-card-c.component.scss'],
    imports: [CommonModule, OperationPostCardPComponent],
})
export class OperationPostCardCComponent {
    private readonly loading = inject(LoadingService);
    private readonly error = inject(ErrorHandlerService);
    private readonly notification = inject(NotificationService);
    private readonly agencyListStateQuery = inject(AgencyListStateQuery);
    private readonly operationPostCardService = inject(
        OperationPostCardService,
    );

    readonly agencies$ = this.agencyListStateQuery.agencies$;
    readonly submitOperationSightingEvent$ =
        this.operationPostCardService.receiveSubmitOperationSightingEvent();

    async onReceiveSubmitSighting(
        formValue: IOperationPostCardForm,
    ): Promise<void> {
        this.loading.open();

        const result = await tryCatchAsync(
            this.operationPostCardService.addOperationSighting(formValue),
        );

        this.loading.close();

        if (result.isFailure()) {
            const e = result.error;
            this.error.handleError(e);
            this.notification.open(e.message, 'OK');
            return;
        }

        this.notification.open('目撃情報を送信しました', 'OK');
    }
}

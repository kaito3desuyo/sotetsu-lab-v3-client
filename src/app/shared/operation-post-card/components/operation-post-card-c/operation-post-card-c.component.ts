import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [OperationPostCardPComponent],
})
export class OperationPostCardCComponent {
    readonly #loading = inject(LoadingService);
    readonly #error = inject(ErrorHandlerService);
    readonly #notification = inject(NotificationService);
    readonly #agencyListStateQuery = inject(AgencyListStateQuery);
    readonly #operationPostCardService = inject(OperationPostCardService);

    readonly agencies = toSignal(this.#agencyListStateQuery.agencies$);
    readonly lastSubmittedAt = toSignal(
        this.#operationPostCardService
            .receiveSubmitOperationSightingEvent()
            .pipe(map(() => new Date().getTime())),
    );

    async onReceiveSubmitSighting(
        formValue: IOperationPostCardForm,
    ): Promise<void> {
        this.#loading.open();

        const result = await tryCatchAsync(
            this.#operationPostCardService.addOperationSighting(formValue),
        );

        this.#loading.close();

        if (result.isFailure()) {
            const e = result.error;
            this.#error.handleError(e);
            this.#notification.open(e.message, 'OK');
            return;
        }

        this.#notification.open('目撃情報を送信しました', 'OK');
    }
}

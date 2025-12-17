import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { OperationPastTimeStateQuery } from '../../states/operation-past-time.state';
import { OperationPastTimeTablePComponent } from '../operation-past-time-table-p/operation-past-time-table-p.component';
import { ConfirmDialogService } from 'src/app/shared/confirm-dialog/services/confirm-dialog.service';
import { UserStateQuery } from 'src/app/global-states/user.state';
import { OperationSightingInvalidationDialogService } from 'src/app/shared/operation-sighting-invalidation-dialog/operation-sighting-invalidation-dialog.service';
import { OperationPastTimeService } from '../../services/operation-past-time.service';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { OperationSightingRestorationDialogService } from 'src/app/shared/operation-sighting-restoration-dialog/operation-sighting-restoration-dialog.service';

@Component({
    selector: 'app-operation-past-time-table-c',
    templateUrl: './operation-past-time-table-c.component.html',
    styleUrls: ['./operation-past-time-table-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [OperationPastTimeTablePComponent],
})
export class OperationPastTimeTableCComponent {
    readonly #userStateQuery = inject(UserStateQuery);
    readonly #operationPastTimeService = inject(OperationPastTimeService);
    readonly #operationPastTimeStateQuery = inject(OperationPastTimeStateQuery);
    readonly #confirmDialogService = inject(ConfirmDialogService);
    readonly #operationSightingInvalidationDialogService = inject(
        OperationSightingInvalidationDialogService,
    );
    readonly #operationSightingRestorationDialogService = inject(
        OperationSightingRestorationDialogService,
    );

    readonly userRole = toSignal(this.#userStateQuery.role$);
    readonly calendars = toSignal(this.#operationPastTimeStateQuery.calendars$);
    readonly formations = toSignal(
        this.#operationPastTimeStateQuery.formations$,
    );
    readonly operationSightings = toSignal(
        this.#operationPastTimeStateQuery.selectOperationSightingsGroupedByDate(),
    );

    readonly tableDisplayed = computed(() => {
        const calendars = this.calendars();
        return !!calendars.length;
    });
    readonly contextMenuDisabled = computed(() => {
        const role = this.userRole();
        return role !== 'manager' && role !== 'editor';
    });

    onReceiveClickInvalidate(ev: { operationSightingId: string }): void {
        const dialogRef = this.#operationSightingInvalidationDialogService.open(
            {
                operationSightingId: ev.operationSightingId,
            },
        );

        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                await tryCatchAsync(
                    this.#operationPastTimeService.fetchOperationSightingsV2(),
                );
            }
        });
    }

    onReceiveClickRestore(ev: { operationSightingId: string }): void {
        const dialogRef = this.#operationSightingRestorationDialogService.open({
            operationSightingId: ev.operationSightingId,
        });

        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                await tryCatchAsync(
                    this.#operationPastTimeService.fetchOperationSightingsV2(),
                );
            }
        });
    }
}

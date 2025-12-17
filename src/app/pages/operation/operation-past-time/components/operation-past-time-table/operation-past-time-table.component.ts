import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { NewFindByIdPipe } from 'src/app/core/pipes/new-find-by-id.pipe';
import { NewOperationNumberColorPipe } from 'src/app/core/pipes/new-operation-number-color.pipe';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { UserStateQuery } from 'src/app/global-states/user.state';
import { NewOperationNumberLinkComponent } from 'src/app/shared/new-operation-number-link/new-operation-number-link.component';
import { OperationSightingInvalidationDialogService } from 'src/app/shared/operation-sighting-invalidation-dialog/operation-sighting-invalidation-dialog.service';
import { OperationSightingRestorationDialogService } from 'src/app/shared/operation-sighting-restoration-dialog/operation-sighting-restoration-dialog.service';
import { OperationPastTimeService } from '../../services/operation-past-time.service';
import { OperationPastTimeStateQuery } from '../../states/operation-past-time.state';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';

@Component({
    selector: 'app-operation-past-time-table',
    templateUrl: './operation-past-time-table.component.html',
    styleUrl: './operation-past-time-table.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        NewOperationNumberLinkComponent,
        DateFnsPipe,
        NewFindByIdPipe,
        NewOperationNumberColorPipe,
    ],
})
export class OperationPastTimeTableComponent {
    readonly #userStateQuery = inject(UserStateQuery);
    readonly #operationPastTimeService = inject(OperationPastTimeService);
    readonly #operationPastTimeStateQuery = inject(OperationPastTimeStateQuery);
    readonly #operationSightingInvalidationDialogService = inject(
        OperationSightingInvalidationDialogService,
    );
    readonly #operationSightingRestorationDialogService = inject(
        OperationSightingRestorationDialogService,
    );

    readonly userRole = toSignal(this.#userStateQuery.role$);
    readonly referenceDate = toSignal(
        this.#operationPastTimeStateQuery.referenceDate$,
    );
    readonly days = toSignal(this.#operationPastTimeStateQuery.days$);
    readonly calendars = toSignal(this.#operationPastTimeStateQuery.calendars$);
    readonly operations = toSignal(
        this.#operationPastTimeStateQuery.operations$,
    );
    readonly formations = toSignal(
        this.#operationPastTimeStateQuery.formations$,
    );
    readonly operationSightings = toSignal(
        this.#operationPastTimeStateQuery.selectOperationSightingsGroupedByDate(),
    );

    readonly tableDisplayed = computed(() => {
        const referenceDate = this.referenceDate();
        const days = this.days();
        return !!referenceDate && !!days;
    });
    readonly contextMenuDisabled = computed(() => {
        const role = this.userRole();
        return role !== 'manager' && role !== 'editor';
    });

    generateOnClickInvalidateCallback(
        sighting: OperationSightingDetailsDto,
    ): () => void {
        return () => {
            const dialogRef =
                this.#operationSightingInvalidationDialogService.open({
                    operationSightingId: sighting.operationSightingId,
                });

            dialogRef.afterClosed().subscribe(async (result) => {
                if (result) {
                    await tryCatchAsync(
                        this.#operationPastTimeService.fetchOperationSightingsV3(),
                    );
                }
            });
        };
    }

    generateOnClickRestoreCallback(
        sighting: OperationSightingDetailsDto,
    ): () => void {
        return () => {
            const dialogRef =
                this.#operationSightingRestorationDialogService.open({
                    operationSightingId: sighting.operationSightingId,
                });

            dialogRef.afterClosed().subscribe(async (result) => {
                if (result) {
                    await tryCatchAsync(
                        this.#operationPastTimeService.fetchOperationSightingsV3(),
                    );
                }
            });
        };
    }
}

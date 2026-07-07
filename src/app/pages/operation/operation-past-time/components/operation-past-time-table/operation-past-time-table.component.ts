import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { NewFindByIdPipe } from 'src/app/core/pipes/new-find-by-id.pipe';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { UserStateQuery } from 'src/app/global-states/user.state';
import { OperationNumberTagComponent } from 'src/app/shared/operation-number-tag/operation-number-tag.component';
import { OperationSightingInvalidationDialogService } from 'src/app/shared/operation-sighting-invalidation-dialog/operation-sighting-invalidation-dialog.service';
import { OperationSightingRestorationDialogService } from 'src/app/shared/operation-sighting-restoration-dialog/operation-sighting-restoration-dialog.service';
import { OperationPastTimeService } from '../../services/operation-past-time.service';
import { OperationPastTimeStore } from '../../stores/operation-past-time.store';
import { matchesAgencyFilter } from '../../utils/operation-past-time-filter.util';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';

const INVALIDATED_BORDER_COLOR = 'rgb(183, 28, 28)';

@Component({
    selector: 'app-operation-past-time-table',
    templateUrl: './operation-past-time-table.component.html',
    styleUrl: './operation-past-time-table.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [OperationNumberTagComponent, DateFnsPipe, NewFindByIdPipe],
})
export class OperationPastTimeTableComponent {
    readonly #userStateQuery = inject(UserStateQuery);
    readonly #operationPastTimeService = inject(OperationPastTimeService);
    readonly #operationSightingInvalidationDialogService = inject(
        OperationSightingInvalidationDialogService,
    );
    readonly #operationSightingRestorationDialogService = inject(
        OperationSightingRestorationDialogService,
    );

    readonly invalidatedBorderColor = INVALIDATED_BORDER_COLOR;

    readonly userRole = toSignal(this.#userStateQuery.role$);
    readonly referenceDate = toSignal(OperationPastTimeStore.referenceDate$);
    readonly days = toSignal(OperationPastTimeStore.days$);
    readonly calendars = toSignal(OperationPastTimeStore.calendars$, {
        initialValue: [],
    });
    readonly operations = toSignal(OperationPastTimeStore.operations$, {
        initialValue: [],
    });
    readonly formations = toSignal(OperationPastTimeStore.formations$, {
        initialValue: [],
    });
    readonly selectedAgencyIds = toSignal(
        OperationPastTimeStore.selectedAgencyIds$,
        { initialValue: [] },
    );
    readonly operationSightings = toSignal(
        OperationPastTimeStore.operationSightingsGroupedByDate$,
        { initialValue: {} },
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
    readonly visibleFormations = computed(() => {
        const selectedAgencyIds = this.selectedAgencyIds();
        return this.formations().filter((formation: FormationDetailsDto) =>
            matchesAgencyFilter(formation.agencyId, selectedAgencyIds),
        );
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

import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationNumberLinkComponent } from 'src/app/shared/operation-number-link/components/operation-number-link/operation-number-link.component';

@Component({
    selector: 'app-operation-past-time-table-p',
    templateUrl: './operation-past-time-table-p.component.html',
    styleUrls: ['./operation-past-time-table-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, DateFnsPipe, OperationNumberLinkComponent],
})
export class OperationPastTimeTablePComponent {
    readonly calendars =
        input.required<{ date: string; calendar: CalendarDetailsDto }[]>();
    readonly formations = input.required<FormationDetailsDto[]>();
    readonly operationSightings = input.required<{
        [formationId: string]: {
            [date: string]: OperationSightingDetailsDto[];
        };
    }>();
    readonly contextMenuDisabled = input.required<boolean>();

    readonly onClickInvalidate = output<{ operationSightingId: string }>();
    readonly onClickRestore = output<{ operationSightingId: string }>();

    generateOnClickInvalidateCallback(
        sighting: OperationSightingDetailsDto,
    ): () => void {
        return () => {
            this.onClickInvalidate.emit({
                operationSightingId: sighting.operationSightingId,
            });
        };
    }

    generateOnClickRestoreCallback(
        sighting: OperationSightingDetailsDto,
    ): () => void {
        return () => {
            this.onClickRestore.emit({
                operationSightingId: sighting.operationSightingId,
            });
        };
    }
}

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RxFor } from '@rx-angular/template/for';
import { RxIf } from '@rx-angular/template/if';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationNumberLinkComponent } from 'src/app/shared/operation-number-link/components/operation-number-link/operation-number-link.component';

@Component({
    standalone: true,
    selector: 'app-operation-past-time-table-p',
    templateUrl: './operation-past-time-table-p.component.html',
    styleUrls: ['./operation-past-time-table-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RxIf,
        RxFor,
        PipesModule,
        //
        OperationNumberLinkComponent,

        // OPERATION_NUMBER_LINK_DECLARATIONS,
    ],
})
export class OperationPastTimeTablePComponent {
    @Input() calendars: { date: string; calendar: CalendarDetailsDto }[];
    @Input() formations: FormationDetailsDto[];
    @Input() operationSightings: {
        [formationId: string]: {
            [date: string]: OperationSightingDetailsDto[];
        };
    };
}

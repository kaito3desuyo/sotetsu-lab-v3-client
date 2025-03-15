import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';

@Component({
    selector: 'app-operation-number-link',
    templateUrl: './operation-number-link.component.html',
    styleUrls: ['./operation-number-link.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterLink,
        MatRippleModule,
        MatTooltipModule,
        PipesModule,
    ]
})
export class OperationNumberLinkComponent {
    readonly operation = input.required<OperationDetailsDto>();
    readonly dayCountFromToday = input<number>();
    readonly tooltipText = input<string>();
}

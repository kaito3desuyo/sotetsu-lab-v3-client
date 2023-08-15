import { RxIf } from '@rx-angular/template/if';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatRippleModule } from '@angular/material/core';
import { RouterModule } from '@angular/router';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
    standalone: true,
    selector: 'app-operation-number-link',
    templateUrl: './operation-number-link.component.html',
    styleUrls: ['./operation-number-link.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterModule,
        RxIf,
        MatRippleModule,
        MatTooltipModule,
        PipesModule,
    ],
})
export class OperationNumberLinkComponent {
    @Input() operation: OperationDetailsDto;
    @Input() dayCountFromToday: number;
    @Input() tooltipText: string;
}

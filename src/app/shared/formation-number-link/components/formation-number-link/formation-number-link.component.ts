import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';

@Component({
    selector: 'app-formation-number-link',
    templateUrl: './formation-number-link.component.html',
    styleUrls: ['./formation-number-link.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule],
})
export class FormationNumberLinkComponent {
    readonly formation = input.required<FormationDetailsDto>();
    readonly dayCountFromToday = input.required<number>();

    readonly formationNumber = computed(
        () => this.formation()?.formationNumber,
    );
}

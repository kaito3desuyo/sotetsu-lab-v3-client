import { RxIf } from '@rx-angular/template/if';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';

@Component({
    standalone: true,
    selector: 'app-formation-number-link',
    templateUrl: './formation-number-link.component.html',
    styleUrls: ['./formation-number-link.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RxIf],
})
export class FormationNumberLinkComponent {
    @Input() formation: FormationDetailsDto;
    @Input() dayCountFromToday: number;
}

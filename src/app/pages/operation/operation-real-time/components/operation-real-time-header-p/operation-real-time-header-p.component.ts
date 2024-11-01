import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Dayjs } from 'dayjs';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';

@Component({
    standalone: true,
    selector: 'app-operation-real-time-header-p',
    templateUrl: './operation-real-time-header-p.component.html',
    styleUrls: ['./operation-real-time-header-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, DateFnsPipe],
})
export class OperationRealTimeHeaderPComponent {
    readonly finalUpdateTime = input.required<Dayjs>();
}

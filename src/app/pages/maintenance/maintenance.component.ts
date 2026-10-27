import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { MaintenanceState } from 'src/app/global-states/maintenance.state';

@Component({
    selector: 'app-maintenance',
    templateUrl: './maintenance.component.html',
    styleUrl: './maintenance.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DateFnsPipe]
})
export class MaintenanceComponent {
    readonly #maintenanceState = inject(MaintenanceState);

    readonly startAt = this.#maintenanceState.startAt;
    readonly endAt = this.#maintenanceState.endAt;
}

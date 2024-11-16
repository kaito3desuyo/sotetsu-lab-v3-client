import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { MaintenanceStateQuery } from 'src/app/global-states/maintenance.state';

@Component({
    standalone: true,
    selector: 'app-maintenance',
    templateUrl: './maintenance.component.html',
    styleUrl: './maintenance.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, DateFnsPipe],
})
export class MaintenanceComponent {
    readonly #maintenanceStateQuery = inject(MaintenanceStateQuery);

    readonly startAt = toSignal(this.#maintenanceStateQuery.startAt$);
    readonly endAt = toSignal(this.#maintenanceStateQuery.endAt$);
}

import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    standalone: true,
    selector: 'app-calendar-select-dialog-header-p',
    templateUrl: './calendar-select-dialog-header-p.component.html',
    styleUrls: ['./calendar-select-dialog-header-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule],
})
export class CalendarSelectDialogHeaderPComponent {
    clickCloseButton = output<void>();
}

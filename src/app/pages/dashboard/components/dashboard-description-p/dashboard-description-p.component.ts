import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LetModule } from '@rx-angular/template/let';

@Component({
    standalone: true,
    selector: 'app-dashboard-description-p',
    templateUrl: './dashboard-description-p.component.html',
    styleUrls: ['./dashboard-description-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [LetModule],
})
export class DashboardDescriptionPComponent {}

import { RxLet } from '@rx-angular/template/let';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-dashboard-description-p',
    templateUrl: './dashboard-description-p.component.html',
    styleUrls: ['./dashboard-description-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RxLet],
})
export class DashboardDescriptionPComponent {}

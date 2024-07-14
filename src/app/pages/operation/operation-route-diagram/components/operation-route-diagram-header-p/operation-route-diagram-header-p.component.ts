import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-operation-route-diagram-header-p',
    templateUrl: './operation-route-diagram-header-p.component.html',
    styleUrls: ['./operation-route-diagram-header-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationRouteDiagramHeaderPComponent {}

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-library-vehicle-header-p',
    templateUrl: './library-vehicle-header-p.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryVehicleHeaderPComponent {}

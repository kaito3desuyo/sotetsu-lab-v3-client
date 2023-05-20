import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-library-vehicle-header-p',
    templateUrl: './library-vehicle-header-p.component.html',
    styleUrls: ['./library-vehicle-header-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryVehicleHeaderPComponent {}

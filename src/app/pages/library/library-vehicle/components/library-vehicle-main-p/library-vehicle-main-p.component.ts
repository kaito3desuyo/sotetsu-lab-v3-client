import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-library-vehicle-main-p',
    templateUrl: './library-vehicle-main-p.component.html',
    styleUrls: ['./library-vehicle-main-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryVehicleMainPComponent {}

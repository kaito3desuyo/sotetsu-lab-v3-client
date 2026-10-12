import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LibraryVehicleHeaderPComponent } from '../library-vehicle-header-p/library-vehicle-header-p.component';

@Component({
    selector: 'app-library-vehicle-header-c',
    templateUrl: './library-vehicle-header-c.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [LibraryVehicleHeaderPComponent],
})
export class LibraryVehicleHeaderCComponent {
    constructor() {}
}

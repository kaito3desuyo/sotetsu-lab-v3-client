import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LibraryVehicleMainPComponent } from '../library-vehicle-main-p/library-vehicle-main-p.component';

@Component({
    selector: 'app-library-vehicle-main-c',
    templateUrl: './library-vehicle-main-c.component.html',
    styleUrls: ['./library-vehicle-main-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [LibraryVehicleMainPComponent],
})
export class LibraryVehicleMainCComponent {
    constructor() {}
}

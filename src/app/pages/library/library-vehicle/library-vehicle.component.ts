import { Component } from '@angular/core';
import { LibraryVehicleHeaderCComponent } from './components/library-vehicle-header-c/library-vehicle-header-c.component';
import { LibraryVehicleMainCComponent } from './components/library-vehicle-main-c/library-vehicle-main-c.component';

@Component({
    selector: 'app-library-vehicle',
    templateUrl: './library-vehicle.component.html',
    styleUrls: ['./library-vehicle.component.scss'],
    imports: [LibraryVehicleHeaderCComponent, LibraryVehicleMainCComponent]
})
export class LibraryVehicleComponent {
    constructor() {}
}

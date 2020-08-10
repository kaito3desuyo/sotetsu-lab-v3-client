import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LibraryVehicleRoutingModule } from './library-vehicle-routing.module';
import { LibraryVehicleComponent } from './library-vehicle.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import { LibraryVehicleHeaderCComponent } from './general/components/library-vehicle-header-c/library-vehicle-header-c.component';
import { LibraryVehicleMainCComponent } from './general/components/library-vehicle-main-c/library-vehicle-main-c.component';

@NgModule({
    declarations: [LibraryVehicleComponent, LibraryVehicleHeaderCComponent, LibraryVehicleMainCComponent],
    imports: [CommonModule, FlexLayoutModule, LibraryVehicleRoutingModule],
})
export class LibraryVehicleModule {}

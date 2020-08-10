import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LibraryVehicleComponent } from './library-vehicle.component';

const routes: Routes = [{ path: '', component: LibraryVehicleComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LibraryVehicleRoutingModule { }

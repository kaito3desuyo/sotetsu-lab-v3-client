import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LibraryComponent } from './library.component';

const routes: Routes = [
    { path: '', component: LibraryComponent },
    {
        path: 'vehicle',
        loadChildren: () =>
            import('./library-vehicle/library-vehicle.module').then(
                (m) => m.LibraryVehicleModule
            ),
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class LibraryRoutingModule {}

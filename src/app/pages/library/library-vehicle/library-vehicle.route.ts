import { Route } from '@angular/router';

export const LIBRARY_VEHICLE_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./library-vehicle.component').then(
                (mod) => mod.LibraryVehicleComponent,
            ),
    },
];

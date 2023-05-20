import { Route } from "@angular/router";

export const LIBRARY_ROUTES: Route[] = [
    {
        path: 'vehicle',
        loadChildren: () => import('./library-vehicle/library-vehicle.route').then((mod) => mod.LIBRARY_VEHICLE_ROUTES)
    }
]
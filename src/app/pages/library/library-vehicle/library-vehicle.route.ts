import { Route } from '@angular/router';

export const LIBRARY_VEHICLE_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./library-vehicle.component').then(
                (mod) => mod.LibraryVehicleComponent,
            ),
        // title が無いためヘッダーがワードマークへフォールバックし、
        // このページだけページ名レベルの見出しが存在しなかった（audit M10）。
        data: {
            title: '相鉄の車両',
        },
    },
];

import { Route } from '@angular/router';

export const DISCLAIMER_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./disclaimer.component').then(
                (mod) => mod.DisclaimerComponent,
            ),
        data: {
            title: '免責事項',
        },
    },
];

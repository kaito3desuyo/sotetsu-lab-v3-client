import { Route } from '@angular/router';

export const RECORDS_ROUTES: Route[] = [
    {
        path: 'formation',
        loadChildren: () =>
            import('./records-formation/records-formation.route').then(
                (mod) => mod.RECORDS_FORMATION_ROUTES,
            ),
    },
];

import { Routes } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';

export const NOT_FOUND_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./not-found.component').then(
                (mod) => mod.NotFoundComponent,
            ),
        resolve: {
            from: pageResolver(),
        },
        data: {
            title: 'ページが見つかりません',
        },
    },
];

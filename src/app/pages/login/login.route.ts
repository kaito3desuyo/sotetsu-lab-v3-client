import { Route } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';

export const LOGIN_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./login.component').then((mod) => mod.LoginComponent),
        resolve: {
            from: pageResolver(),
        },
        data: {
            title: 'ログイン',
        },
        runGuardsAndResolvers: 'always',
    },
];

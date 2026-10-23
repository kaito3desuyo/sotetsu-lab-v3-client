import { Route } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';

export const REGISTER_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./register.component').then((mod) => mod.RegisterComponent),
        resolve: {
            from: pageResolver(),
        },
        data: {
            title: '新規登録',
        },
        runGuardsAndResolvers: 'always',
    },
];

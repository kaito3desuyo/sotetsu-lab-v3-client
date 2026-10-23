import { Route } from '@angular/router';

export const LOGIN_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./login.component').then((mod) => mod.LoginComponent),
        title: 'ログイン',
    },
];

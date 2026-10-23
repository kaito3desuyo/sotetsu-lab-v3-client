import { Route } from '@angular/router';

export const REGISTER_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./register.component').then((mod) => mod.RegisterComponent),
        title: '新規登録',
    },
];

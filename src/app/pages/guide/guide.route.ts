import { Route } from '@angular/router';

export const GUIDE_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./guide.component').then((mod) => mod.GuideComponent),
        data: {
            title: '使い方',
        },
    },
];

import { Route } from '@angular/router';

export const GLOSSARY_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./glossary.component').then((mod) => mod.GlossaryComponent),
        data: {
            title: '用語集',
        },
    },
];

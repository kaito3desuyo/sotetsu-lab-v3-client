import { Route } from '@angular/router';

export const MODERATION_ROUTES: Route[] = [
    {
        path: '',
        loadChildren: () =>
            import('./moderation-recent/moderation-recent.route').then(
                (mod) => mod.MODERATION_RECENT_ROUTES,
            ),
    },
    {
        path: 'users/:userId',
        loadChildren: () =>
            import('./moderation-user/moderation-user.route').then(
                (mod) => mod.MODERATION_USER_ROUTES,
            ),
    },
];

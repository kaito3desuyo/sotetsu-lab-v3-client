import { Route } from '@angular/router';

export const MODERATION_ROUTES: Route[] = [
    {
        path: '',
        loadChildren: () =>
            import('./moderation-recent/moderation-recent.route').then(
                (mod) => mod.MODERATION_RECENT_ROUTES,
            ),
    },
    // Task 3: users/:userId（投稿者のページ。moderation-user/）をここに足す
];

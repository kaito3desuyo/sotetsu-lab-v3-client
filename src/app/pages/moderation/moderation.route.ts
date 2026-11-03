import { Route } from '@angular/router';
import { moderationGuard } from './guards/moderation.guard';

/**
 * 投稿管理は editor / manager だけ（moderationGuard）。
 * 子の 2 ルートに同じ守りを 1 回で掛けるため、パスなしの親に置く。
 * 元は app.route.ts の moderation ルートに掛けていたので、毎回走る（'always'）のも同じ。
 */
export const MODERATION_ROUTES: Route[] = [
    {
        path: '',
        canActivate: [moderationGuard],
        runGuardsAndResolvers: 'always',
        children: [
            {
                path: 'users/:userId',
                loadChildren: () =>
                    import('./moderation-user/moderation-user.route').then(
                        (mod) => mod.MODERATION_USER_ROUTES,
                    ),
            },
            {
                path: '',
                loadChildren: () =>
                    import('./moderation-recent/moderation-recent.route').then(
                        (mod) => mod.MODERATION_RECENT_ROUTES,
                    ),
            },
        ],
    },
];

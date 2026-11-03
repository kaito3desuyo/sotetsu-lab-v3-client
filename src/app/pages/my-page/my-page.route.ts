import { Route } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import { myPageGuard } from './guards/my-page.guard';

/**
 * マイページは、ログイン中で viewer でない人だけ（myPageGuard）。
 * 投稿管理（moderation.route.ts）と同じ形で、パスなしの親に守りを置く。毎回走る（'always'）。
 */
export const MY_PAGE_ROUTES: Route[] = [
    {
        path: '',
        canActivate: [myPageGuard],
        runGuardsAndResolvers: 'always',
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('./my-page.component').then(
                        (mod) => mod.MyPageComponent,
                    ),
                resolve: {
                    from: pageResolver(),
                },
                data: {
                    title: 'マイページ',
                },
                runGuardsAndResolvers: 'always',
            },
        ],
    },
];

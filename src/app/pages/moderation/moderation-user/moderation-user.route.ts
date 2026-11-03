import { Route } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import { ModerationUserService } from './services/moderation-user.service';

export const MODERATION_USER_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./moderation-user.component').then(
                (mod) => mod.ModerationUserComponent,
            ),
        providers: [ModerationUserService],
        resolve: {
            from: pageResolver(),
        },
        data: {
            title: '投稿者',
        },
        runGuardsAndResolvers: 'always',
    },
];

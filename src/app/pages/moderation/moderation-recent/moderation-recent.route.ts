import { Route } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import { ModerationRecentService } from './services/moderation-recent.service';

export const MODERATION_RECENT_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./moderation-recent.component').then(
                (mod) => mod.ModerationRecentComponent,
            ),
        providers: [ModerationRecentService],
        resolve: {
            from: pageResolver(),
        },
        data: {
            title: '見回り',
        },
        runGuardsAndResolvers: 'always',
    },
];

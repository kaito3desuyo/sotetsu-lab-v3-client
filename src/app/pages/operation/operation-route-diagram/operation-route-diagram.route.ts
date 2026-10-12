import { Route } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import OPERATION_SEARCH_CARD_PROVIDERS from 'src/app/shared/operation-search-card/operation-search-card.provider';
import { OperationRouteDiagramService } from './services/operation-route-diagram.service';

export const OPERATION_ROUTE_DIAGRAM_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./operation-route-diagram.component').then(
                (mod) => mod.OperationRouteDiagramComponent,
            ),
        providers: [
            OperationRouteDiagramService,
            ...OPERATION_SEARCH_CARD_PROVIDERS,
        ],
        resolve: {
            from: pageResolver(),
        },
        data: {
            title: '運用行路図',
        },
    },
];

import { Route } from '@angular/router';
import OPERATION_SEARCH_CARD_PROVIDERS from 'src/app/shared/operation-search-card/operation-search-card.provider';
import { OperationRouteDiagramResolverService } from './services/operation-route-diagram-resolver.service';
import { OperationRouteDiagramService } from './services/operation-route-diagram.service';
import {
    OperationRouteDiagramStateQuery,
    OperationRouteDiagramStateStore,
} from './states/operation-route-diagram.state';

export const OPERATION_ROUTE_DIAGRAM_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./operation-route-diagram.component').then(
                (mod) => mod.OperationRouteDiagramComponent
            ),
        providers: [
            OperationRouteDiagramService,
            OperationRouteDiagramResolverService,
            OperationRouteDiagramStateStore,
            OperationRouteDiagramStateQuery,
            ...OPERATION_SEARCH_CARD_PROVIDERS,
        ],
        resolve: {
            from: OperationRouteDiagramResolverService,
        },
        data: {
            title: '運用行路図',
        },
        runGuardsAndResolvers: 'always',
    },
];

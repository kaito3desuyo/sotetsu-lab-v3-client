import { Route } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import { OperationRouteDiagramService } from './services/operation-route-diagram.service';

export const OPERATION_ROUTE_DIAGRAM_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./operation-route-diagram.component').then(
                (mod) => mod.OperationRouteDiagramComponent,
            ),
        providers: [OperationRouteDiagramService],
        resolve: {
            from: pageResolver(),
        },
        data: {
            title: '運用行路図',
            description:
                '相鉄線の運用行路図。1 つの運用が 1 日に走る列車を路線図の上に描きます。',
        },
    },
];

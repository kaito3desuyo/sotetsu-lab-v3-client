import { Route } from '@angular/router';
import { TrainDiagramResolverService } from './services/train-diagram-resolver.service';
import { TrainDiagramService } from './services/train-diagram.service';

export const TRAIN_DIAGRAM_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./train-diagram.component').then(
                (mod) => mod.TrainDiagramComponent,
            ),
        providers: [
            TrainDiagramService,
            TrainDiagramResolverService,
        ],
        resolve: {
            from: TrainDiagramResolverService,
        },
        data: {
            title: 'ダイヤグラム',
        },
        runGuardsAndResolvers: 'always',
    },
];

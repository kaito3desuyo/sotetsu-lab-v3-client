import { Route } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import { TrainDiagramService } from './services/train-diagram.service';
import { TrainDiagramStore } from './stores/train-diagram.store';

export const TRAIN_DIAGRAM_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./train-diagram.component').then(
                (mod) => mod.TrainDiagramComponent,
            ),
        providers: [TrainDiagramService],
        resolve: {
            from: pageResolver(TrainDiagramStore.persistInitialized$),
        },
        data: {
            title: 'ダイヤグラム',
            description:
                '相鉄線と直通先の列車ダイヤグラム。ダイヤごとに全列車の走りを線で描きます。',
        },
        runGuardsAndResolvers: 'always',
    },
];

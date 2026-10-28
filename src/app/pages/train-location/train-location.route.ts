import { Route } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import { TrainLocationService } from './services/train-location.service';
import { TrainLocationStore } from './stores/train-location.store';

export const TRAIN_LOCATION_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./train-location.component').then(
                (mod) => mod.TrainLocationComponent,
            ),
        providers: [TrainLocationService],
        resolve: {
            from: pageResolver(TrainLocationStore),
        },
        data: {
            title: '列車位置情報',
            description:
                '相鉄線の列車位置情報。時刻表と目撃情報から、いまの列車の位置を路線図に描きます。',
        },
        runGuardsAndResolvers: 'always',
    },
];

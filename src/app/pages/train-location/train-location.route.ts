import { Route } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import { TrainLocationService } from './services/train-location.service';

export const TRAIN_LOCATION_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./train-location.component').then(
                (mod) => mod.TrainLocationComponent,
            ),
        providers: [TrainLocationService],
        resolve: {
            from: pageResolver(),
        },
        data: {
            title: '列車位置情報',
        },
        runGuardsAndResolvers: 'always',
    },
];

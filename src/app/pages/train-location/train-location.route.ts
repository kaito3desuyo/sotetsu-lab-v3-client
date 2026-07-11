import { Route } from '@angular/router';
import { TrainLocationResolverService } from './services/train-location-resolver.service';
import { TrainLocationService } from './services/train-location.service';

export const TRAIN_LOCATION_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./train-location.component').then(
                (mod) => mod.TrainLocationComponent,
            ),
        providers: [TrainLocationService, TrainLocationResolverService],
        resolve: {
            from: TrainLocationResolverService,
        },
        data: {
            title: '列車位置情報',
        },
        runGuardsAndResolvers: 'always',
    },
];

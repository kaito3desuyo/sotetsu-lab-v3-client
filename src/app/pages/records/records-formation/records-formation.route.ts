import { Routes } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import { RecordsFormationService } from './services/records-formation.service';

export const RECORDS_FORMATION_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./records-formation.component').then(
                (mod) => mod.RecordsFormationComponent,
            ),
        providers: [RecordsFormationService],
        resolve: {
            from: pageResolver(),
        },
        data: {
            title: '編成の記録',
            description:
                '編成ごとに、月のカレンダーで日々の運用番号を確認できます。今日の運用と、最後に目撃された日も表示します。',
        },
    },
];

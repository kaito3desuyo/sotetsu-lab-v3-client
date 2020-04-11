import { NgModule } from '@angular/core';
import { Routes, RouterModule, PreloadAllModules } from '@angular/router';

const routes: Routes = [
    {
        path: '',
        loadChildren: () =>
            import('./pages/dashboard/dashboard.module').then(
                (mod) => mod.DashboardModule
            ),
    },
    {
        path: 'operation',
        loadChildren: () =>
            import('./pages/operation/operation.module').then(
                (mod) => mod.OperationModule
            ),
    },
    {
        path: 'timetable',
        loadChildren: () =>
            import('./pages/timetable/timetable.module').then(
                (mod) => mod.TimetableModule
            ),
    },
];

@NgModule({
    imports: [
        RouterModule.forRoot(routes, {
            onSameUrlNavigation: 'reload',
            preloadingStrategy: PreloadAllModules,
        }),
    ],
    exports: [RouterModule],
})
export class AppRoutingModule {}

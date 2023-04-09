import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
    {
        path: '',
        loadChildren: () =>
            import('./pages/dashboard/dashboard.route').then(
                (mod) => mod.DASHBOARD_ROUTES
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
    {
        path: 'library',
        loadChildren: () =>
            import('./pages/library/library.module').then(
                (m) => m.LibraryModule
            ),
    },
];

@NgModule({
    imports: [
        RouterModule.forRoot(routes, {
            onSameUrlNavigation: 'reload',
            // preloadingStrategy: PreloadAllModules,
            scrollPositionRestoration: 'enabled',
        }),
    ],
    exports: [RouterModule],
})
export class AppRoutingModule {}

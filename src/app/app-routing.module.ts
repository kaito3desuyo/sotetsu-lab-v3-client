import { NgModule } from '@angular/core';
import { Routes, RouterModule, PreloadAllModules } from '@angular/router';
import { TokenResolver } from './core/token/token.resolver';

const routes: Routes = [
    {
        path: '',
        resolve: {
            token: TokenResolver,
        },
        loadChildren: () =>
            import('./pages/dashboard/dashboard.module').then(
                (mod) => mod.DashboardModule
            ),
    },
    {
        path: 'operation',
        resolve: {
            token: TokenResolver,
        },
        loadChildren: () =>
            import('./pages/operation/operation.module').then(
                (mod) => mod.OperationModule
            ),
    },
    {
        path: 'timetable',
        resolve: {
            token: TokenResolver,
        },
        loadChildren: () =>
            import('./pages/timetable/timetable.module').then(
                (mod) => mod.TimetableModule
            ),
    },
    {
        path: 'library',
        resolve: {
            token: TokenResolver,
        },
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
            preloadingStrategy: PreloadAllModules,
            relativeLinkResolution: 'legacy',
            scrollPositionRestoration: 'enabled',
        }),
    ],
    exports: [RouterModule],
})
export class AppRoutingModule {}

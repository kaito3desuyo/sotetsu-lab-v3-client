import {
    buildRouteTable,
    collectComponentRoutes,
} from './build-route-preloads.mjs';

const sources: Record<string, string> = {
    'src/app/app.route.ts': `
        export const APP_ROUTES: Routes = [
            { path: '', loadChildren: () => import('./pages/home/home.route').then((mod) => mod.HOME_ROUTES) },
            { path: 'timetable', loadChildren: () => import('./pages/timetable/timetable.route').then((mod) => mod.TIMETABLE_ROUTES) },
            { path: 'moderation', loadChildren: () => import('./pages/moderation/moderation.route').then((mod) => mod.MODERATION_ROUTES) },
            { path: LOAD_ERROR_PATH, component: LoadErrorComponent },
            { path: '**', loadChildren: () => import('./pages/not-found/not-found.route').then((mod) => mod.NOT_FOUND_ROUTES) },
        ];`,
    'src/app/pages/home/home.route.ts': `
        export const HOME_ROUTES: Route[] = [
            { path: '', loadComponent: () => import('./home.component').then((mod) => mod.HomeComponent) },
        ];`,
    'src/app/pages/timetable/timetable.route.ts': `
        export const TIMETABLE_ROUTES: Routes = [
            { path: 'station', loadChildren: () => import('./station/station.route').then((mod) => mod.STATION_ROUTES) },
        ];`,
    'src/app/pages/timetable/station/station.route.ts': `
        export const STATION_ROUTES: Route[] = [
            { path: '', loadComponent: () => import('./station.component').then((m) => m.StationComponent) },
        ];`,
    'src/app/pages/moderation/moderation.route.ts': `
        export const MODERATION_ROUTES: Route[] = [
            { path: '', children: [
                { path: 'users/:userId', loadComponent: () => import('src/app/pages/moderation/user.component').then((m) => m.UserComponent) },
            ] },
        ];`,
    'src/app/pages/not-found/not-found.route.ts': `
        export const NOT_FOUND_ROUTES: Route[] = [
            { path: '', loadComponent: () => import('./not-found.component').then((m) => m.NotFoundComponent) },
        ];`,
};

const read = (file: string): string | undefined => sources[file];

const metafile = {
    outputs: {
        'main-AAA.js': { entryPoint: 'src/main.ts' },
        'chunk-home.js': { entryPoint: 'src/app/pages/home/home.component.ts' },
        'chunk-station.js': {
            entryPoint: 'src/app/pages/timetable/station/station.component.ts',
        },
        'chunk-user.js': {
            entryPoint: 'src/app/pages/moderation/user.component.ts',
        },
        'chunk-nf.js': {
            entryPoint: 'src/app/pages/not-found/not-found.component.ts',
        },
        'styles-X.css': { entryPoint: 'angular:styles/global:styles' },
        'chunk-other.js': {},
    },
};

describe('collectComponentRoutes', () => {
    it('loadChildren をたどって URL の path と部品のファイルを集める', () => {
        expect(collectComponentRoutes(read)).toEqual([
            ['/', 'src/app/pages/home/home.component.ts'],
            [
                '/timetable/station',
                'src/app/pages/timetable/station/station.component.ts',
            ],
            [
                '/moderation/users/:userId',
                'src/app/pages/moderation/user.component.ts',
            ],
        ]);
    });

    it('読めないファイルは飛ばす', () => {
        expect(collectComponentRoutes(() => undefined)).toEqual([]);
    });
});

describe('buildRouteTable', () => {
    it('metafile の entryPoint から chunk 名を引く（** と path が読めないルートは載せない）', () => {
        expect(buildRouteTable(metafile, read)).toEqual({
            '/': 'chunk-home.js',
            '/timetable/station': 'chunk-station.js',
            '/moderation/users/:userId': 'chunk-user.js',
        });
    });

    it('出力に無い部品は表に載せない', () => {
        expect(
            buildRouteTable(
                {
                    outputs: {
                        'chunk-home.js': metafile.outputs['chunk-home.js'],
                    },
                },
                read,
            ),
        ).toEqual({ '/': 'chunk-home.js' });
    });
});

import { RenderMode, type ServerRoute } from '@angular/ssr';

/**
 * ページごとのサーバーでの描き方。
 * 今は手元で全ページをサーバーで描けるか確かめるためだけに使う（angular.json の ssr-check 構成）。
 * ページごとの描き分けは spec 4 章に沿って次の計画で決める。
 */
export const serverRoutes: ServerRoute[] = [
    { path: '**', renderMode: RenderMode.Server },
];

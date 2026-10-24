import { RenderMode, type ServerRoute } from '@angular/ssr';
import { CACHE_CONTROL } from './core/ssr/cache-control';

const LONG = { 'Cache-Control': CACHE_CONTROL.long };
const NO_STORE = { 'Cache-Control': CACHE_CONTROL['no-store'] };

/**
 * ページごとのサーバーでの描き方（spec 4 章）。
 * - 入力・ログインが要るページはブラウザで描く（Client）。CDN に置かない
 * - ほかはサーバーで描き、既定で長く置く。ページが SsrResponse で短くしたりタグを足したりする
 * - 枠だけのページ（ダッシュボード・real-time・列車位置情報）もここでは Server。中身を取らないのはページ側
 * - どれにも当たらない URL は 404 の枠を描いて短く置く
 * matrix param（;calendar_id=…）は当てはめる前に外される（@angular/ssr の stripMatrixParams）
 */
export const serverRoutes: ServerRoute[] = [
    { path: 'login', renderMode: RenderMode.Client, headers: NO_STORE },
    { path: 'register', renderMode: RenderMode.Client, headers: NO_STORE },
    { path: 'maintenance', renderMode: RenderMode.Client, headers: NO_STORE },
    { path: 'timetable/add', renderMode: RenderMode.Client, headers: NO_STORE },
    {
        path: 'timetable/copy',
        renderMode: RenderMode.Client,
        headers: NO_STORE,
    },
    {
        path: 'timetable/update',
        renderMode: RenderMode.Client,
        headers: NO_STORE,
    },
    { path: '', renderMode: RenderMode.Server, headers: LONG },
    {
        path: 'operation/real-time',
        renderMode: RenderMode.Server,
        headers: LONG,
    },
    {
        path: 'operation/past-time',
        renderMode: RenderMode.Server,
        headers: LONG,
    },
    { path: 'operation/table', renderMode: RenderMode.Server, headers: LONG },
    {
        path: 'operation/route-diagram',
        renderMode: RenderMode.Server,
        headers: LONG,
    },
    { path: 'timetable/station', renderMode: RenderMode.Server, headers: LONG },
    {
        path: 'timetable/all-line',
        renderMode: RenderMode.Server,
        headers: LONG,
    },
    { path: 'train-diagram', renderMode: RenderMode.Server, headers: LONG },
    { path: 'train-location', renderMode: RenderMode.Server, headers: LONG },
    { path: 'library/vehicle', renderMode: RenderMode.Server, headers: LONG },
    {
        path: '**',
        renderMode: RenderMode.Server,
        status: 404,
        headers: { 'Cache-Control': CACHE_CONTROL.short },
    },
];

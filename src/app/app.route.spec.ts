import { APP_ROUTES } from './app.route';

const find = (path: string) => APP_ROUTES.find((r) => r.path === path);

describe('APP_ROUTES', () => {
    // pageResolver は InitializeState の完了を待つ。完了させるのは initialDataResolver だけなので、
    // records に付いていないと直接開いたときに遷移が終わらず、画面が真っ白になる
    it('records は timetable と同じく、メンテナンスの確認と初期データの取得を付ける', () => {
        const records = find('records');
        const timetable = find('timetable');
        expect(records?.canActivate).toEqual(timetable?.canActivate);
        expect(records?.resolve).toEqual(timetable?.resolve);
        expect(records?.runGuardsAndResolvers).toBe('always');
    });
});

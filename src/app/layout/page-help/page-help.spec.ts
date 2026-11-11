import {
    findPageHelp,
    PAGE_HELP_TABLE,
    SITE_INTRO,
    toHelpPage,
    toHelpPath,
} from './page-help';

describe('toHelpPage（GA に送るパスの型）', () => {
    it('表にあるページはそのパス', () => {
        expect(toHelpPage('/operation/table')).toBe('/operation/table');
        expect(toHelpPage('/')).toBe('/');
    });

    it('編成別時刻表は説明のあるページとして扱う', () => {
        expect(toHelpPage('/timetable/formation')).toBe('/timetable/formation');
        expect(PAGE_HELP_TABLE['/timetable/formation']).toBeDefined();
    });

    it('投稿者ページは id を送らずに型に丸める', () => {
        expect(toHelpPage('/moderation/users/abc-123')).toBe(
            '/moderation/users/:userId',
        );
    });

    it('説明の無い既知のページはそのパス', () => {
        expect(toHelpPage('/login')).toBe('/login');
        expect(toHelpPage('/maintenance')).toBe('/maintenance');
    });

    it('どのページにも当たらない URL は 1 つの値にまとめる', () => {
        expect(toHelpPage('/no-such-page/xyz')).toBe('(not-found)');
    });
});

describe('toHelpPath', () => {
    it('行列パラメータを取り除く', () => {
        expect(toHelpPath('/operation/table;calendar_id=x;calendar_id=x')).toBe(
            '/operation/table',
        );
    });

    it('? と # 以降を取り除く', () => {
        expect(toHelpPath('/timetable/station?x=1#a')).toBe(
            '/timetable/station',
        );
    });

    it('/ だけは残し、末尾の / は取り除く', () => {
        expect(toHelpPath('/')).toBe('/');
        expect(toHelpPath('/guide/')).toBe('/guide');
    });
});

describe('findPageHelp', () => {
    it('リアルタイム運用情報の説明は 3〜5 行', () => {
        const lines = findPageHelp('/operation/real-time')?.lines ?? [];
        expect(lines.length).toBeGreaterThanOrEqual(3);
        expect(lines.length).toBeLessThanOrEqual(5);
    });

    it('時刻表の追加・編集・コピーは同じ説明を共有する', () => {
        const add = findPageHelp('/timetable/add');
        expect(add).not.toBeNull();
        expect(findPageHelp('/timetable/update')).toEqual(add);
        expect(findPageHelp('/timetable/copy')).toEqual(add);
    });

    it('投稿者ページは id に関わらず説明がある', () => {
        expect(findPageHelp('/moderation/users/abc')).not.toBeNull();
    });

    it('表に無いページは null', () => {
        expect(findPageHelp('/login')).toBeNull();
        expect(findPageHelp('/maintenance')).toBeNull();
        expect(findPageHelp('/no-such-page')).toBeNull();
    });

    it('表のすべての説明が 3〜5 行', () => {
        for (const [path, help] of Object.entries(PAGE_HELP_TABLE)) {
            expect([
                path,
                help.lines.length >= 3 && help.lines.length <= 5,
            ]).toEqual([path, true]);
        }
    });

    it('サイトの一言説明がある', () => {
        expect(SITE_INTRO.length).toBeGreaterThan(0);
    });
});

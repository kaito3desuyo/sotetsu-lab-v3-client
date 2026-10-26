import { formatPageTitle } from './format-page-title.util';

describe('formatPageTitle', () => {
    it('詳しいところを括弧に「・」でつなぐ', () => {
        expect(
            formatPageTitle('二俣川駅 時刻表', ['下り', '2026/3/14改正 平日']),
        ).toBe('二俣川駅 時刻表（下り・2026/3/14改正 平日）');
    });

    it('空のところは落とす。全部空なら元の題名だけ', () => {
        expect(formatPageTitle('運用表', [null, undefined, ''])).toBe('運用表');
    });
});

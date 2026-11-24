import {
    formatPeriodRange,
    formatSlashDate,
    toModificationRow,
} from './formation-display.util';

const period = (startDate: string | null, endDate: string | null) => ({
    startDate,
    endDate,
    vehicleType: '7000',
    agencyName: '相鉄',
    cars: [],
});

describe('formation-display.util', () => {
    it('日付は YYYY/M/D（0 を付けない）', () => {
        expect(formatSlashDate('2019-04-29')).toBe('2019/4/29');
    });

    it('期間の見出し：始まりが空なら「〜終わり」、終わりが空なら「始まり〜」', () => {
        expect(formatPeriodRange(period('2019-04-29', '2019-05-12'))).toBe(
            '2019/4/29〜2019/5/12',
        );
        expect(formatPeriodRange(period(null, '2019-04-28'))).toBe(
            '〜2019/4/28',
        );
        expect(formatPeriodRange(period('2019-05-13', null))).toBe(
            '2019/5/13〜',
        );
        expect(formatPeriodRange(period(null, null))).toBe('期間不明');
    });

    it('塗り替えは外観の名前に説明を続ける。全車なら「全車」', () => {
        expect(
            toModificationRow({
                modifiedOn: '2024-03-01',
                kind: 'livery',
                value: '10000-ynb',
                description: '月までしか分からない',
                vehicles: 'all',
            }),
        ).toEqual({
            date: '2024/3/1',
            kind: '塗り替え',
            content: '10000 の YNB 月までしか分からない',
            target: '全車',
        });
    });

    it('日付が無ければ「新製時」。対象は車両番号を「・」でつなぐ', () => {
        expect(
            toModificationRow({
                modifiedOn: null,
                kind: 'livery',
                value: '7000',
                description: null,
                vehicles: ['7710', '7125'],
            }),
        ).toEqual({
            date: '新製時',
            kind: '塗り替え',
            content: '7000',
            target: '7710・7125',
        });
    });

    it('塗り替え以外は説明を出す。知らない種類はそのまま出す', () => {
        expect(
            toModificationRow({
                modifiedOn: '2020-01-01',
                kind: 'equipment',
                value: null,
                description: 'VVVF を SiC に更新',
                vehicles: 'all',
            }),
        ).toMatchObject({ kind: '機器更新', content: 'VVVF を SiC に更新' });
        expect(
            toModificationRow({
                modifiedOn: '2020-01-01',
                kind: 'renewal',
                value: null,
                description: null,
                vehicles: 'all',
            }),
        ).toMatchObject({ kind: 'リニューアル', content: '' });
        expect(
            toModificationRow({
                modifiedOn: '2020-01-01',
                kind: 'platform-door',
                value: null,
                description: null,
                vehicles: 'all',
            }).kind,
        ).toBe('ホームドア対応');
        expect(
            toModificationRow({
                modifiedOn: '2020-01-01',
                kind: 'other',
                value: null,
                description: null,
                vehicles: 'all',
            }).kind,
        ).toBe('other');
    });

    it('表に無い塗装の値はそのまま出す', () => {
        expect(
            toModificationRow({
                modifiedOn: '2020-01-01',
                kind: 'livery',
                value: 'unknown-x',
                description: null,
                vehicles: 'all',
            }).content,
        ).toBe('unknown-x');
    });
});

import { FilterChipOption } from '../filter-chips/filter-chip-option.type';
import {
    formatFilterPart,
    formatRouteFilterSummary,
    isRouteFilterActive,
    joinSummaryParts,
} from './control-band-summary.util';

const options: FilterChipOption[] = [
    { value: 'r1', label: '本線', group: '相鉄' },
    { value: 'r2', label: 'いずみ野線', group: '相鉄' },
    { value: 'r3', label: '厚木線', group: '相鉄' },
    { value: 'r4', label: '新横浜線', group: '相鉄' },
    { value: 'j1', label: '相鉄直通線', group: 'JR東日本' },
    { value: 't1', label: '東横線', group: '東急' },
    { value: 't2', label: '目黒線', group: '東急', disabled: true },
];

describe('formatFilterPart', () => {
    it('空なら「絞り込み：なし」', () => {
        expect(formatFilterPart([])).toBe('絞り込み：なし');
    });
    it('選択を「・」でつなぐ', () => {
        expect(formatFilterPart(['東急', 'K群（目黒線）'])).toBe(
            '絞り込み中：東急・K群（目黒線）',
        );
    });
});

describe('formatRouteFilterSummary', () => {
    it('何も選んでいなければ全路線', () => {
        expect(formatRouteFilterSummary(options, [])).toBe('全路線');
    });
    it('押せる路線を全部選んでいれば全路線（disabled は数えない）', () => {
        expect(
            formatRouteFilterSummary(options, [
                'r1',
                'r2',
                'r3',
                'r4',
                'j1',
                't1',
            ]),
        ).toBe('全路線');
    });
    it('会社の路線が 2 本以上そろっていれば「会社の N 路線」にまとめる', () => {
        expect(
            formatRouteFilterSummary(options, ['r1', 'r2', 'r3', 'r4']),
        ).toBe('相鉄の 4 路線');
    });
    it('そろっていない会社は路線名を並べる', () => {
        expect(formatRouteFilterSummary(options, ['r1', 'r3', 't1'])).toBe(
            '本線・厚木線・東横線',
        );
    });
    it('1 本しかない会社はまとめない', () => {
        expect(
            formatRouteFilterSummary(options, ['r1', 'r2', 'r3', 'r4', 'j1']),
        ).toBe('相鉄の 4 路線・相鉄直通線');
    });
    it('選択肢がまだ空なら全路線', () => {
        expect(formatRouteFilterSummary([], ['r1'])).toBe('全路線');
    });
    it('group の無い選択肢は路線名を並べる', () => {
        const plain: FilterChipOption[] = [
            { value: 'a', label: '本線' },
            { value: 'b', label: '厚木線' },
            { value: 'c', label: '東横線' },
        ];
        expect(formatRouteFilterSummary(plain, ['a', 'b'])).toBe(
            '本線・厚木線',
        );
    });
});

describe('isRouteFilterActive', () => {
    it('空・全部・選択肢なしは絞り込み中ではない', () => {
        expect(isRouteFilterActive(options, [])).toBe(false);
        expect(
            isRouteFilterActive(options, ['r1', 'r2', 'r3', 'r4', 'j1', 't1']),
        ).toBe(false);
        expect(isRouteFilterActive([], ['r1'])).toBe(false);
    });
    it('一部だけなら絞り込み中', () => {
        expect(isRouteFilterActive(options, ['r1'])).toBe(true);
    });
});

describe('joinSummaryParts', () => {
    it('空の部分を飛ばして空白でつなぐ', () => {
        expect(joinSummaryParts(['横浜', null, '', undefined, '下り'])).toBe(
            '横浜 下り',
        );
    });
});

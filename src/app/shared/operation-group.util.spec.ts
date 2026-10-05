import {
    compareGroupNames,
    deriveGroupName,
    deriveGroupNames,
    matchesGroupFilter,
    operationGroupOptions,
    RETIRED_GROUP_NAME,
    RETIRED_OPERATION_NUMBER,
} from './operation-group.util';

describe('operationGroupOptions', () => {
    it('実在する運用番号から群のチップを作り、休を末尾に足す', () => {
        const options = operationGroupOptions(['51', '11', '91G', '79']);

        expect(options.map((option) => option.value)).toEqual([
            '1群',
            '5群',
            '7群',
            '9G群',
            '休',
        ]);
        expect(options.every((option) => option.label === option.value)).toBe(
            true,
        );
        expect(options.every((option) => !!option.color)).toBe(true);
    });
});

describe('deriveGroupName', () => {
    it('規則: 数字の最初の1桁 + 記号（あれば）', () => {
        expect(deriveGroupName('11')).toBe('1群');
        expect(deriveGroupName('59')).toBe('5群');
        expect(deriveGroupName('79')).toBe('7群');
        expect(deriveGroupName('86')).toBe('8群');
        expect(deriveGroupName('91G')).toBe('9G群');
        expect(deriveGroupName('01K')).toBe('0K群');
        expect(deriveGroupName('60K')).toBe('6K群');
        expect(deriveGroupName('31G')).toBe('3G群');
    });

    it('API が返す既存 5 群の運用番号を矛盾なく再現する（2026-08-22 実測）', () => {
        const apiGroups: Record<string, string[]> = {
            '1群': ['11', '12', '13', '14', '15', '16'],
            '5群': ['51', '52', '53', '54', '55', '56', '57', '58', '59'],
            '6群': ['61', '62', '63', '64', '65', '66', '67', '68', '69'],
            '7群': ['70', '71', '72', '73'],
            '9G群': ['91G', '92G', '93G', '94G', '95G'],
        };

        for (const [groupName, operationNumbers] of Object.entries(apiGroups)) {
            const derived = [...new Set(operationNumbers.map(deriveGroupName))];
            expect(derived).toEqual([groupName]);
        }
    });

    it('休車（運用番号100）は運用群ではなく「休」', () => {
        // 規則をそのまま当てると「1群」になってしまうため特別扱いが要る。
        expect(deriveGroupName(RETIRED_OPERATION_NUMBER)).toBe(
            RETIRED_GROUP_NAME,
        );
    });

    it('空・規則に当てはまらない形式は null', () => {
        expect(deriveGroupName(undefined)).toBeNull();
        expect(deriveGroupName('')).toBeNull();
        expect(deriveGroupName('K11')).toBeNull();
        expect(deriveGroupName('-')).toBeNull();
    });
});

describe('deriveGroupNames', () => {
    it('実在する運用番号から重複なく群名を導出する', () => {
        expect(deriveGroupNames(['11', '12', '51', '91G', '01K'])).toEqual([
            '1群',
            '5群',
            '9G群',
            '0K群',
        ]);
    });

    it('記号なし → G → K の順にまとめ、その中で数字の昇順、休は末尾', () => {
        expect(
            deriveGroupNames(['91G', '11', '51K', '51', '100', '31G', '01K']),
        ).toEqual(['1群', '5群', '3G群', '9G群', '0K群', '5K群', '休']);
    });

    it('導出できない運用番号は黙って捨てる', () => {
        expect(deriveGroupNames(['11', '', 'K11'])).toEqual(['1群']);
    });
});

describe('compareGroupNames', () => {
    it('記号なし → G → K の順（数字より記号を優先して束ねる）', () => {
        expect(compareGroupNames('8群', '3G群')).toBeLessThan(0);
        expect(compareGroupNames('9G群', '0K群')).toBeLessThan(0);
        expect(compareGroupNames('5群', '5K群')).toBeLessThan(0);
    });

    it('同じ記号どうしは数字の昇順', () => {
        expect(compareGroupNames('1群', '8群')).toBeLessThan(0);
        expect(compareGroupNames('6K群', '0K群')).toBeGreaterThan(0);
    });

    it('休は常に末尾', () => {
        expect(compareGroupNames(RETIRED_GROUP_NAME, '0K群')).toBeGreaterThan(
            0,
        );
        expect(compareGroupNames('9G群', RETIRED_GROUP_NAME)).toBeLessThan(0);
    });
});

describe('matchesGroupFilter', () => {
    it('未選択（空配列）時は常に true', () => {
        expect(matchesGroupFilter('11', [])).toBe(true);
        expect(matchesGroupFilter(undefined, [])).toBe(true);
    });

    it('1群選択時、その群の運用番号のみ true', () => {
        expect(matchesGroupFilter('11', ['1群'])).toBe(true);
        expect(matchesGroupFilter('91G', ['1群'])).toBe(false);
    });

    it('複数群選択時は OR', () => {
        expect(matchesGroupFilter('91G', ['1群', '9G群'])).toBe(true);
    });

    it('記号違いは別の群として扱う', () => {
        // 51 と 51K は先頭の数字が同じでも別群。混ざってはならない。
        expect(matchesGroupFilter('51K', ['5群'])).toBe(false);
        expect(matchesGroupFilter('51', ['5K群'])).toBe(false);
        expect(matchesGroupFilter('51K', ['5K群'])).toBe(true);
    });

    it('API の群定義から漏れていた運用番号も絞り込める（本改修の目的）', () => {
        // 旧実装では API が 7群 = 70〜73 しか返さず 74〜79 が絞り込めなかった。
        expect(matchesGroupFilter('79', ['7群'])).toBe(true);
        expect(matchesGroupFilter('50', ['5群'])).toBe(true);
        // 8群・K群・9G群以外のG群は API に存在すらしなかった。
        expect(matchesGroupFilter('86', ['8群'])).toBe(true);
        expect(matchesGroupFilter('01K', ['0K群'])).toBe(true);
        expect(matchesGroupFilter('31G', ['3G群'])).toBe(true);
    });

    it('operationNumber が解決できない場合、絞り込み中は除外', () => {
        expect(matchesGroupFilter(undefined, ['1群'])).toBe(false);
    });

    it('どの選択群にも属さない場合は除外', () => {
        expect(matchesGroupFilter('70', ['1群'])).toBe(false);
    });

    it('休グループ選択で運用番号100のみマッチする', () => {
        expect(matchesGroupFilter('100', [RETIRED_GROUP_NAME])).toBe(true);
        expect(matchesGroupFilter('11', [RETIRED_GROUP_NAME])).toBe(false);
        // 100 が「1群」に混入しないこと。
        expect(matchesGroupFilter('100', ['1群'])).toBe(false);
    });
});

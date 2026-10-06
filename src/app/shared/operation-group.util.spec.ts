import {
    compareGroupNames,
    deriveGroupName,
    deriveGroupNames,
    matchesGroupFilter,
    normalizeGroupNames,
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
            'G群（東横線）',
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
    });

    it('記号付き（G・K）は乗り入れる方面でまとめる（2026-10-06）', () => {
        expect(deriveGroupName('31G')).toBe('G群（目黒線）');
        expect(deriveGroupName('44G')).toBe('G群（目黒線）');
        expect(deriveGroupName('91G')).toBe('G群（東横線）');
        expect(deriveGroupName('01K')).toBe('K群（目黒線）');
        expect(deriveGroupName('48K')).toBe('K群（目黒線）');
        expect(deriveGroupName('51K')).toBe('K群（東横線）');
        expect(deriveGroupName('65K')).toBe('K群（東横線）');
    });

    it('本番の運用番号（2026.3 改正）の G・K を、経路で確かめた方面どおりに分ける', () => {
        // 相鉄の外の経路（2026-10-06 に本番 DB で確認）:
        // 目黒線側 = 南北線・三田線・埼玉高速、東横線側 = 副都心線・有楽町線・東武・西武。
        // 35K は奥沢（目黒線だけの駅）、60K は渋谷（東横線だけの駅）に止まる。
        // 65K（平日）と 93G・95G（土休日）は経路で決まらないので番号どおり。
        const meguro = [
            '31G',
            '32G',
            '33G',
            '34G',
            '35G',
            '37G',
            '38G',
            '39G',
            '41G',
            '42G',
            '43G',
            '44G',
            '01K',
            '02K',
            '04K',
            '05K',
            '09K',
            '10K',
            '18K',
            '20K',
            '29K',
            '30K',
            '35K',
            '36K',
            '40K',
            '44K',
            '48K',
        ];
        const toyoko = [
            '91G',
            '92G',
            '93G',
            '94G',
            '95G',
            '51K',
            '52K',
            '53K',
            '57K',
            '60K',
            '61K',
            '64K',
            '65K',
        ];

        expect([...new Set(meguro.map(deriveGroupName))]).toEqual([
            'G群（目黒線）',
            'K群（目黒線）',
        ]);
        expect([...new Set(toyoko.map(deriveGroupName))]).toEqual([
            'G群（東横線）',
            'K群（東横線）',
        ]);
    });

    it('方面の表に無い先頭の数字は、方面を決めず元の規則で出す', () => {
        expect(deriveGroupName('51G')).toBe('5G群');
        expect(deriveGroupName('71K')).toBe('7K群');
        expect(deriveGroupName('11X')).toBe('1X群');
    });

    it('API が返す既存 5 群の運用番号を矛盾なく再現する（2026-08-22 実測）', () => {
        const apiGroups: Record<string, string[]> = {
            '1群': ['11', '12', '13', '14', '15', '16'],
            '5群': ['51', '52', '53', '54', '55', '56', '57', '58', '59'],
            '6群': ['61', '62', '63', '64', '65', '66', '67', '68', '69'],
            '7群': ['70', '71', '72', '73'],
            'G群（東横線）': ['91G', '92G', '93G', '94G', '95G'],
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
            'G群（東横線）',
            'K群（目黒線）',
        ]);
    });

    it('記号なし → G → K の順にまとめ、その中で目黒線 → 東横線、休は末尾', () => {
        expect(
            deriveGroupNames(['91G', '11', '51K', '51', '100', '31G', '01K']),
        ).toEqual([
            '1群',
            '5群',
            'G群（目黒線）',
            'G群（東横線）',
            'K群（目黒線）',
            'K群（東横線）',
            '休',
        ]);
    });

    it('導出できない運用番号は黙って捨てる', () => {
        expect(deriveGroupNames(['11', '', 'K11'])).toEqual(['1群']);
    });
});

describe('compareGroupNames', () => {
    it('記号なし → G → K の順（数字より記号を優先して束ねる）', () => {
        expect(compareGroupNames('8群', 'G群（目黒線）')).toBeLessThan(0);
        expect(
            compareGroupNames('G群（東横線）', 'K群（目黒線）'),
        ).toBeLessThan(0);
    });

    it('同じ記号どうしは目黒線 → 東横線、方面の無い群はその後ろ', () => {
        expect(compareGroupNames('1群', '8群')).toBeLessThan(0);
        expect(
            compareGroupNames('K群（東横線）', 'K群（目黒線）'),
        ).toBeGreaterThan(0);
        expect(compareGroupNames('G群（東横線）', '5G群')).toBeLessThan(0);
    });

    it('休は常に末尾', () => {
        expect(
            compareGroupNames(RETIRED_GROUP_NAME, 'K群（東横線）'),
        ).toBeGreaterThan(0);
        expect(
            compareGroupNames('G群（目黒線）', RETIRED_GROUP_NAME),
        ).toBeLessThan(0);
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
        expect(matchesGroupFilter('91G', ['1群', 'G群（東横線）'])).toBe(true);
    });

    it('記号違いは別の群として扱う', () => {
        // 51 と 51K は先頭の数字が同じでも別群。混ざってはならない。
        expect(matchesGroupFilter('51K', ['5群'])).toBe(false);
        expect(matchesGroupFilter('51', ['K群（東横線）'])).toBe(false);
        expect(matchesGroupFilter('51K', ['K群（東横線）'])).toBe(true);
        expect(matchesGroupFilter('91G', ['K群（東横線）'])).toBe(false);
    });

    it('API の群定義から漏れていた運用番号も絞り込める（本改修の目的）', () => {
        // 旧実装では API が 7群 = 70〜73 しか返さず 74〜79 が絞り込めなかった。
        expect(matchesGroupFilter('79', ['7群'])).toBe(true);
        expect(matchesGroupFilter('50', ['5群'])).toBe(true);
        // 8群・K群・9G群以外のG群は API に存在すらしなかった。
        expect(matchesGroupFilter('86', ['8群'])).toBe(true);
        expect(matchesGroupFilter('01K', ['K群（目黒線）'])).toBe(true);
        expect(matchesGroupFilter('31G', ['G群（目黒線）'])).toBe(true);
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

describe('normalizeGroupNames', () => {
    it('2026-10-06 より前に保存した群名を、方面でまとめた名前に置き換えて重なりを除く', () => {
        expect(
            normalizeGroupNames([
                '1群',
                '3G群',
                '4G群',
                '9G群',
                '0K群',
                '6K群',
            ]),
        ).toEqual([
            '1群',
            'G群（目黒線）',
            'G群（東横線）',
            'K群（目黒線）',
            'K群（東横線）',
        ]);
    });

    it('今の名前・休・方面の無い群はそのまま', () => {
        expect(
            normalizeGroupNames(['G群（目黒線）', RETIRED_GROUP_NAME, '5G群']),
        ).toEqual(['G群（目黒線）', RETIRED_GROUP_NAME, '5G群']);
    });
});

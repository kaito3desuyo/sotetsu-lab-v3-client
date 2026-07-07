import {
    matchesGroupFilter,
    RETIRED_GROUP_NAME,
    RETIRED_OPERATION_NUMBER,
    withRetiredGroup,
} from './operation-table-filter.util';

describe('operation-table-filter.util', () => {
    describe('withRetiredGroup', () => {
        it('休車（100）の疑似グループを末尾に追加する', () => {
            const groups = [
                { groupName: '1群', operationNumbers: ['11', '12'] },
            ];

            expect(withRetiredGroup(groups)).toEqual([
                ...groups,
                {
                    groupName: RETIRED_GROUP_NAME,
                    operationNumbers: [RETIRED_OPERATION_NUMBER],
                },
            ]);
        });
    });

    describe('matchesGroupFilter', () => {
        const groups = [
            { groupName: '1群', operationNumbers: ['11', '12'] },
            { groupName: '9G群', operationNumbers: ['91G', '92G'] },
        ];

        it('未選択（空配列）時は常に true（全カード表示）', () => {
            expect(matchesGroupFilter('11', [], groups)).toBe(true);
        });

        it('選択群に属する運用番号は true', () => {
            expect(matchesGroupFilter('11', ['1群'], groups)).toBe(true);
        });

        it('選択群に属さない運用番号は false', () => {
            expect(matchesGroupFilter('91G', ['1群'], groups)).toBe(false);
        });

        it('operationNumber が解決できない場合は false', () => {
            expect(matchesGroupFilter(undefined, ['1群'], groups)).toBe(
                false,
            );
        });

        it('複数選択時は OR 判定', () => {
            expect(
                matchesGroupFilter('91G', ['1群', '9G群'], groups),
            ).toBe(true);
        });
    });
});

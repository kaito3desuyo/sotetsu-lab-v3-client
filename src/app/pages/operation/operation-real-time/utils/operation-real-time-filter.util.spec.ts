import { OperationGroupDto } from 'src/app/libs/operation/usecase/dtos/operation-group.dto';
import {
    matchesAgencyFilter,
    matchesGroupFilter,
    RETIRED_GROUP_NAME,
    RETIRED_OPERATION_NUMBER,
    withRetiredGroup,
} from './operation-real-time-filter.util';

describe('matchesAgencyFilter', () => {
    it('未選択（空配列）時は常に true', () => {
        expect(matchesAgencyFilter('agency-1', [])).toBe(true);
        expect(matchesAgencyFilter(undefined, [])).toBe(true);
    });

    it('1社選択時、一致する agencyId のみ true', () => {
        expect(matchesAgencyFilter('agency-1', ['agency-1'])).toBe(true);
        expect(matchesAgencyFilter('agency-2', ['agency-1'])).toBe(false);
    });

    it('複数社選択時は OR', () => {
        expect(
            matchesAgencyFilter('agency-2', ['agency-1', 'agency-2']),
        ).toBe(true);
        expect(
            matchesAgencyFilter('agency-3', ['agency-1', 'agency-2']),
        ).toBe(false);
    });

    it('agencyId が解決できない場合、絞り込み中は除外', () => {
        expect(matchesAgencyFilter(undefined, ['agency-1'])).toBe(false);
    });
});

describe('matchesGroupFilter', () => {
    const groups: OperationGroupDto[] = [
        { groupName: '1群', operationNumbers: ['11', '12', '13'] },
        { groupName: '9G群', operationNumbers: ['91G', '92G'] },
    ];

    it('未選択（空配列）時は常に true', () => {
        expect(matchesGroupFilter('11', [], groups)).toBe(true);
        expect(matchesGroupFilter(undefined, [], groups)).toBe(true);
    });

    it('1群選択時、その群の運用番号のみ true', () => {
        expect(matchesGroupFilter('11', ['1群'], groups)).toBe(true);
        expect(matchesGroupFilter('91G', ['1群'], groups)).toBe(false);
    });

    it('複数群選択時は OR', () => {
        expect(matchesGroupFilter('91G', ['1群', '9G群'], groups)).toBe(true);
    });

    it('operationNumber が解決できない場合、絞り込み中は除外', () => {
        expect(matchesGroupFilter(undefined, ['1群'], groups)).toBe(false);
    });

    it('どの選択群にも属さない場合は除外', () => {
        expect(matchesGroupFilter('70', ['1群'], groups)).toBe(false);
    });
});

describe('withRetiredGroup', () => {
    it('休（運用番号100）の疑似グループを末尾に付加する', () => {
        const groups: OperationGroupDto[] = [
            { groupName: '1群', operationNumbers: ['11'] },
        ];

        const result = withRetiredGroup(groups);

        expect(result).toEqual([
            { groupName: '1群', operationNumbers: ['11'] },
            {
                groupName: RETIRED_GROUP_NAME,
                operationNumbers: [RETIRED_OPERATION_NUMBER],
            },
        ]);
    });

    it('休グループ選択で運用番号100のみマッチする', () => {
        const withRetired = withRetiredGroup([]);
        expect(matchesGroupFilter('100', ['休'], withRetired)).toBe(true);
        expect(matchesGroupFilter('11', ['休'], withRetired)).toBe(false);
    });
});

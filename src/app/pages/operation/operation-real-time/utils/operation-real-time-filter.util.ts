import { OperationGroupDto } from 'src/app/libs/operation/usecase/dtos/operation-group.dto';

/**
 * 休車（運用番号 100）は API の /v3/operations/groups には含まれない
 * （circulation map に登場しないため）。編成順テーブルで休車編成を
 * 群チップから絞り込み対象外にしないよう、client 側で疑似グループを補う。
 */
export const RETIRED_GROUP_NAME = '休';
export const RETIRED_OPERATION_NUMBER = '100';

export function withRetiredGroup(
    groups: OperationGroupDto[],
): OperationGroupDto[] {
    return [
        ...groups,
        {
            groupName: RETIRED_GROUP_NAME,
            operationNumbers: [RETIRED_OPERATION_NUMBER],
        },
    ];
}

/**
 * 編成の所属会社（`formations.agencyId`）による絞り込み判定。
 * 非破壊フィルタ: 未選択（空配列）時は常に true（全件表示）。
 * 複数選択時は OR。agencyId が解決できない場合、絞り込み中は除外する。
 */
export function matchesAgencyFilter(
    agencyId: string | undefined,
    selectedAgencyIds: string[],
): boolean {
    if (selectedAgencyIds.length === 0) return true;
    if (!agencyId) return false;
    return selectedAgencyIds.includes(agencyId);
}

/**
 * 運用群（groupName → operationNumbers[] の写像）による絞り込み判定。
 * 未選択時は常に true。複数選択時は OR。operationNumber が解決できない、
 * またはどの選択群にも属さない場合は除外する。
 */
export function matchesGroupFilter(
    operationNumber: string | undefined,
    selectedGroupNames: string[],
    groups: OperationGroupDto[],
): boolean {
    if (selectedGroupNames.length === 0) return true;
    if (!operationNumber) return false;
    return groups
        .filter((group) => selectedGroupNames.includes(group.groupName))
        .some((group) => group.operationNumbers.includes(operationNumber));
}

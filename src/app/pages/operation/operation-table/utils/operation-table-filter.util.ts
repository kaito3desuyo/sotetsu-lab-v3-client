import { OperationGroupDto } from 'src/app/libs/operation/usecase/dtos/operation-group.dto';

/**
 * 休車（運用番号 100）は API の /v3/operations/groups には含まれない
 * （circulation map に登場しないため）。B3（リアルタイム運用情報）と同様に
 * client 側で疑似グループを補い、群チップから絞り込み対象外にしないようにする。
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
 * 運用群（groupName → operationNumbers[] の写像）による絞り込み判定。
 * 未選択時は常に true（全カード表示）。複数選択時は OR。
 * データ再取得は行わず、カード単位の表示/非表示にのみ使う。
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

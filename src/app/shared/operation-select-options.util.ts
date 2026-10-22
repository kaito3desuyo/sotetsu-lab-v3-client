import { generateOperationSortNumber } from 'src/app/core/utils/generate-operation-sort-number';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StepTarget } from './step-nav/step-target.type';

/** 運用番号の選択欄の選択肢（休車の 100 を除き番号順）。検索カードと運用行路図の帯が使う。 */
export function toOperationSelectOptions(
    operations: OperationDetailsDto[],
): OperationDetailsDto[] {
    return operations
        .filter((o) => o.operationNumber !== '100')
        .sort(
            (a, b) =>
                Number(generateOperationSortNumber(a.operationNumber)) -
                Number(generateOperationSortNumber(b.operationNumber)),
        );
}

/** 前後の運用（運用行路図の「前後へ送る」）。選択欄と同じ並びの 1 つ前と 1 つ後。 */
export function findNeighborOperations(
    operations: OperationDetailsDto[],
    operationId: string | null | undefined,
): { prev: StepTarget[]; next: StepTarget[] } {
    const index = operations.findIndex((o) => o.operationId === operationId);
    if (!operationId || index < 0) return { prev: [], next: [] };
    const toTarget = (o: OperationDetailsDto | undefined): StepTarget[] =>
        o ? [{ id: o.operationId, label: o.operationNumber }] : [];
    return {
        prev: toTarget(operations[index - 1]),
        next: toTarget(operations[index + 1]),
    };
}

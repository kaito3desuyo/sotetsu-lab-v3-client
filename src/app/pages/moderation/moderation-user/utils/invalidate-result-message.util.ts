import { InvalidateManyOperationSightingsResultDto } from 'src/app/libs/operation-sighting/usecase/dtos/invalidate-many-operation-sightings-result.dto';

/**
 * まとめての無効化の結果を、1 つの通知の文にする。
 * 何件無効にし、何件飛ばし、どこで止まり、何件残ったかを、あるものだけ「。」でつなぐ。
 * @param failedLabel 止まった目撃の呼び名（運番など）。一覧に無ければ id の頭を使う
 */
export function buildInvalidateResultMessage(
    result: InvalidateManyOperationSightingsResultDto,
    failedLabel?: string,
): string {
    const parts = [`${result.invalidated.length} 件を無効にしました`];
    if (result.skipped.length > 0) {
        parts.push(
            `${result.skipped.length} 件は飛ばしました（すでに無効・見つからない）`,
        );
    }
    if (result.failed) {
        const label = failedLabel ?? result.failed.id.slice(0, 8);
        parts.push(`${label} で止まりました: ${result.failed.message}`);
    }
    if (result.pending.length > 0) {
        parts.push(`残り ${result.pending.length} 件は無効にできていません`);
    }
    return parts.join('。');
}

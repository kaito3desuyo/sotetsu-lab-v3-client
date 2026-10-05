import { NewOperationNumberColorPipe } from 'src/app/core/pipes/new-operation-number-color.pipe';
import { FilterChipOption } from './filter-chips/filter-chip-option.type';

const operationNumberColor = new NewOperationNumberColorPipe();

/**
 * 休車（運用番号 100）は API の /v3/operations/groups には含まれない
 * （circulation map に登場しないため）。運用番号としては「1群」の規則に
 * 当てはまってしまうが、休車は運用群ではないので独立した群として扱う。
 */
export const RETIRED_GROUP_NAME = '休';
export const RETIRED_OPERATION_NUMBER = '100';

/**
 * 運用番号から運用群名を導出する。
 *
 * **規則（ユーザー確認済み 2026-08-22）: 数字の最初の 1 桁 + 記号（存在する場合）。**
 *
 * ```
 * 11  → 1群     51  → 5群     79  → 7群
 * 91G → 9G群    01K → 0K群    60K → 6K群
 * 100 → 休（運用群ではなく休車。上の規則の対象外）
 * ```
 *
 * この規則は API `/v3/operations/groups` が返す既存 5 群（1群 / 5群 / 6群 /
 * 7群 / 9G群）の operationNumbers を **矛盾なく完全に再現する**ことを実測で
 * 確認している。API 側は規則が違うのではなく、単に群の定義が不足しており
 * （実データ 93 運用番号のうち 33 件しかカバーせず、5群は 50 が、7群は
 * 74〜79 が欠落）、本来 15 群あるべきところ 5 群しか返していない。
 * その修正は server 側の課題として別途扱い、client はこの規則から導出する
 * （ユーザー判断 2026-08-22）。
 *
 * @returns 群名。運用番号が空、または規則に当てはまらない形式の場合は null。
 */
export function deriveGroupName(
    operationNumber: string | undefined,
): string | null {
    if (!operationNumber) return null;
    if (operationNumber === RETIRED_OPERATION_NUMBER) return RETIRED_GROUP_NAME;

    const matched = operationNumber.match(/^(\d)\d*([A-Za-z]*)$/);
    if (!matched) return null;

    const [, leadingDigit, symbol] = matched;
    return `${leadingDigit}${symbol.toUpperCase()}群`;
}

/**
 * 記号の並び順（ユーザー指示 2026-08-22）。**記号なし → G → K** の順にまとめ、
 * そのグループ内で数字の昇順に並べる。数字を先に見るのではなく記号で束ねるのは、
 * 「相鉄線内の運用」「JR 直通」「東急直通」がその単位で意味を持つため。
 */
const SYMBOL_ORDER = ['', 'G', 'K'];

/**
 * 群名の表示順。記号（なし → G → K → その他）→ 数字の昇順。
 * 休は運用群ではないので常に末尾に置く。
 */
export function compareGroupNames(a: string, b: string): number {
    if (a === b) return 0;
    if (a === RETIRED_GROUP_NAME) return 1;
    if (b === RETIRED_GROUP_NAME) return -1;

    const parse = (name: string): [number, string] => {
        const matched = name.match(/^(\d)([A-Za-z]*)群$/);
        return matched ? [Number(matched[1]), matched[2]] : [Number.NaN, name];
    };
    const rank = (symbol: string): number => {
        const index = SYMBOL_ORDER.indexOf(symbol);
        // 未知の記号は末尾側へ。同順位どうしは辞書順で決着させる。
        return index === -1 ? SYMBOL_ORDER.length : index;
    };
    const [digitA, symbolA] = parse(a);
    const [digitB, symbolB] = parse(b);

    if (rank(symbolA) !== rank(symbolB)) return rank(symbolA) - rank(symbolB);
    if (symbolA !== symbolB) return symbolA.localeCompare(symbolB);
    return digitA - digitB;
}

/**
 * 実在する運用番号の集合から、表示すべき運用群名を導出する。
 *
 * API の群定義ではなく**実際に画面へ出る運用番号**を入力にするので、
 * 「チップに出ているのに絞り込めない運用がある」「実在しない群のチップが出る」
 * のどちらも起きない。
 */
export function deriveGroupNames(operationNumbers: string[]): string[] {
    const names = new Set<string>();
    for (const operationNumber of operationNumbers) {
        const groupName = deriveGroupName(operationNumber);
        if (groupName) names.add(groupName);
    }
    return [...names].sort(compareGroupNames);
}

/**
 * 運用群チップの選択肢。群は実在する運用番号から導出し、休は常に末尾へ足す
 * （休は運用一覧に現れない場合があるため）。見本色は群の代表運用番号から引く。
 * リアルタイム運用情報と運用表で同じチップを出す（ユーザー指示 2026-09-25）。
 */
export function operationGroupOptions(
    operationNumbers: string[],
): FilterChipOption[] {
    const groupNames = deriveGroupNames([
        ...operationNumbers,
        RETIRED_OPERATION_NUMBER,
    ]);

    return groupNames.map((groupName) => ({
        value: groupName,
        label: groupName,
        color: operationNumberColor.transform(
            groupName === RETIRED_GROUP_NAME
                ? RETIRED_OPERATION_NUMBER
                : (operationNumbers.find(
                      (operationNumber) =>
                          deriveGroupName(operationNumber) === groupName,
                  ) ?? ''),
        ),
    }));
}

/**
 * 運用群による絞り込み判定。群は運用番号から `deriveGroupName` で導出する。
 * 未選択時は常に true。複数選択時は OR。operationNumber が解決できない、
 * または導出した群が選択されていない場合は除外する。
 */
export function matchesGroupFilter(
    operationNumber: string | undefined,
    selectedGroupNames: string[],
): boolean {
    if (selectedGroupNames.length === 0) return true;

    const groupName = deriveGroupName(operationNumber);
    if (!groupName) return false;

    return selectedGroupNames.includes(groupName);
}

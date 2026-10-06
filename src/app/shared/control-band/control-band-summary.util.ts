import {
    FilterChipOption,
    FilterChipValue,
} from '../filter-chips/filter-chip-option.type';

/**
 * 操作帯の細帯に出す要約の部品（docs/design.md「操作帯は貼り付き、どこからでも開ける」）。
 * ページごとの文はページの utils で組み立て、共通の言い回しだけここに置く。
 */
export function formatFilterPart(labels: string[]): string {
    return labels.length === 0
        ? '絞り込み：なし'
        : `絞り込み中：${labels.join('・')}`;
}

export function joinSummaryParts(parts: (string | null | undefined)[]): string {
    return parts.filter((part): part is string => !!part).join(' ');
}

function selectedEnabled(
    options: FilterChipOption[],
    selected: FilterChipValue[],
): { enabled: FilterChipOption[]; picked: FilterChipOption[] } {
    const enabled = options.filter((option) => !option.disabled);
    const picked = enabled.filter((option) => selected.includes(option.value));
    return { enabled, picked };
}

/** 絞り込みは「空＝全部」。押せる路線を全部選んでいるときも絞り込み中ではない。 */
export function isRouteFilterActive(
    options: FilterChipOption[],
    selected: FilterChipValue[],
): boolean {
    const { enabled, picked } = selectedEnabled(options, selected);
    return picked.length > 0 && picked.length < enabled.length;
}

/**
 * 「全路線」か、選んだ路線を並べた文。会社の押せる路線が 2 本以上あって全部選んでいれば
 * 「相鉄の 4 路線」にまとめる。「路線：」の前置きは呼ぶ側で付ける。
 */
export function formatRouteFilterSummary(
    options: FilterChipOption[],
    selected: FilterChipValue[],
): string {
    if (!isRouteFilterActive(options, selected)) return '全路線';

    const { enabled, picked } = selectedEnabled(options, selected);
    const parts: string[] = [];
    const doneGroups = new Set<string>();
    for (const option of picked) {
        const group = option.group;
        if (!group) {
            parts.push(option.label);
            continue;
        }
        if (doneGroups.has(group)) continue;
        doneGroups.add(group);
        const enabledInGroup = enabled.filter((o) => o.group === group);
        const pickedInGroup = picked.filter((o) => o.group === group);
        if (
            enabledInGroup.length >= 2 &&
            pickedInGroup.length === enabledInGroup.length
        ) {
            parts.push(`${group}の ${pickedInGroup.length} 路線`);
        } else {
            parts.push(...pickedInGroup.map((o) => o.label));
        }
    }
    return parts.join('・');
}

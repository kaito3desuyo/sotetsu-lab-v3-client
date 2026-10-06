import { formatFilterPart } from 'src/app/shared/control-band/control-band-summary.util';

/** 細帯の要約。例「絞り込み中：東急・K群（目黒線） 36/120 運用」。 */
export function formatRealTimeSummary(params: {
    agencies: { agencyId: string; agencyName?: string }[];
    selectedAgencyIds: string[];
    selectedGroupNames: string[];
    shown: number;
    total: number;
}): string {
    const agencyNames = params.selectedAgencyIds
        .map((id) => params.agencies.find((a) => a.agencyId === id)?.agencyName)
        .filter((name): name is string => !!name);
    const labels = [...agencyNames, ...params.selectedGroupNames];
    if (labels.length === 0) return formatFilterPart([]);
    return `${formatFilterPart(labels)} ${params.shown}/${params.total} 運用`;
}

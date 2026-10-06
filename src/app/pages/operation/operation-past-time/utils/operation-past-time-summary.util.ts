import { format, parse } from 'date-fns';
import {
    formatFilterPart,
    joinSummaryParts,
} from 'src/app/shared/control-band/control-band-summary.util';

/** 細帯の要約。例「10/6 から 7 日間 絞り込み中：東急」。 */
export function formatPastTimeSummary(params: {
    referenceDate: string | null;
    days: number | null;
    agencies: { agencyId: string; agencyName?: string }[];
    selectedAgencyIds: string[];
}): string {
    const range =
        params.referenceDate && params.days
            ? `${format(parse(params.referenceDate, 'yyyy-MM-dd', new Date()), 'M/d')} から ${params.days} 日間`
            : null;
    const names = params.selectedAgencyIds
        .map((id) => params.agencies.find((a) => a.agencyId === id)?.agencyName)
        .filter((name): name is string => !!name);
    return joinSummaryParts([range, formatFilterPart(names)]);
}

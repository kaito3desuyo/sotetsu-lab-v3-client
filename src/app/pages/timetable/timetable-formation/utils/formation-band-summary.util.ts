import { format, parse } from 'date-fns';
import {
    formatFilterPart,
    joinSummaryParts,
} from 'src/app/shared/control-band/control-band-summary.util';
import { FormationDateKind } from '../stores/timetable-formation.store';

const DATE_KIND_NOTE: Record<FormationDateKind, string> = {
    today: '（今日）',
    tomorrow: '（明日・見込み）',
    past: '',
};

/** 操作帯の要約の行。例「8713 11/12（今日） 絞り込み中：二俣川」。 */
export function formatFormationBandSummary(params: {
    formationNumber: string | null;
    date: string | null;
    dateKind: FormationDateKind;
    stationName: string | null;
}): string {
    if (!params.formationNumber) return '編成番号を入れてください';
    const day = params.date
        ? `${format(parse(params.date, 'yyyy-MM-dd', new Date()), 'M/d')}${DATE_KIND_NOTE[params.dateKind]}`
        : null;
    return joinSummaryParts([
        params.formationNumber,
        day,
        formatFilterPart(params.stationName ? [params.stationName] : []),
    ]);
}

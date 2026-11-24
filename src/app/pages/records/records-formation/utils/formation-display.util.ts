import { LIVERY_LABELS, toLivery } from '../constants/livery';
import { FormationPeriod, ModificationEntry } from './formation-periods.util';

/** 'YYYY-MM-DD' → 'YYYY/M/D' */
export const formatSlashDate = (date: string): string => {
    const [year, month, day] = date.split('-');
    return `${Number(year)}/${Number(month)}/${Number(day)}`;
};

/** 期間の見出し。始まりの日が無ければ「〜2019/4/28」、終わりの日が無ければ「2019/5/13〜」。 */
export const formatPeriodRange = (period: FormationPeriod): string => {
    const start = period.startDate ? formatSlashDate(period.startDate) : '';
    const end = period.endDate ? formatSlashDate(period.endDate) : '';
    return start || end ? `${start}〜${end}` : '期間不明';
};

const KIND_LABELS: Readonly<Record<string, string>> = {
    livery: '塗り替え',
    exterior: '外観の変更',
    renewal: 'リニューアル',
    equipment: '機器更新',
    'platform-door': 'ホームドア対応',
};

export interface ModificationRow {
    /** 'YYYY/M/D'。日付が無ければ「新製時」 */
    date: string;
    kind: string;
    /** 塗装の名前・説明。無ければ空 */
    content: string;
    /** 「全車」、または車両番号を「・」でつないだもの */
    target: string;
}

export const toModificationRow = (
    entry: ModificationEntry,
): ModificationRow => {
    const livery = entry.kind === 'livery' ? toLivery(entry.value) : null;
    const name =
        entry.kind === 'livery'
            ? livery
                ? LIVERY_LABELS[livery]
                : (entry.value ?? '')
            : '';
    const content =
        entry.kind === 'livery'
            ? name && entry.description
                ? `${name}（${entry.description}）`
                : name || (entry.description ?? '')
            : (entry.description ?? '');
    return {
        date: entry.modifiedOn ? formatSlashDate(entry.modifiedOn) : '新製時',
        kind: KIND_LABELS[entry.kind] ?? entry.kind,
        content,
        target: entry.vehicles === 'all' ? '全車' : entry.vehicles.join('・'),
    };
};

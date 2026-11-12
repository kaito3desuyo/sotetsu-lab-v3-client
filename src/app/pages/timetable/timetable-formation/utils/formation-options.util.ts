import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';

export interface FormationOptionGroup {
    /** 「相鉄 8000」（会社と形式） */
    label: string;
    formationNumbers: string[];
}

/** 全角・小文字のゆれを無くして比べる */
const normalize = (value: string): string =>
    value.normalize('NFKC').toUpperCase().trim();

/**
 * 編成番号の欄の候補。並び（会社の順・番号順。TodaysFormationListState.todaysFormationsSorted）を保ったまま、
 * 会社と形式ごとにまとめる。query を含む編成だけを残し、空のまとまりは出さない。
 */
export function groupFormationOptions(
    sortedFormations: readonly FormationDetailsDto[],
    agencies: readonly AgencyDetailsDto[],
    query: string,
): FormationOptionGroup[] {
    const needle = normalize(query);
    const groups: FormationOptionGroup[] = [];
    const byLabel = new Map<string, FormationOptionGroup>();
    for (const formation of sortedFormations) {
        const number = formation.formationNumber;
        if (!number || !normalize(number).includes(needle)) continue;
        const agencyName =
            agencies.find((a) => a.agencyId === formation.agencyId)
                ?.agencyName ?? '';
        const label = [agencyName, formation.vehicleType]
            .filter((part) => !!part)
            .join(' ');
        let group = byLabel.get(label);
        if (!group) {
            group = { label, formationNumbers: [] };
            byLabel.set(label, group);
            groups.push(group);
        }
        group.formationNumbers.push(number);
    }
    return groups;
}

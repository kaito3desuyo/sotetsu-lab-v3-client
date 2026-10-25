/**
 * 返す項目の選択（API の `include`・`fields[資源]=項目,項目`。sotetsu-lab-v3-api docs/adr/0010-v3-include-and-fields.md）。
 * fields を指定すると値が null の項目は省かれる。
 */
export type FormationFields = Readonly<Record<string, readonly string[]>>;

/** 起動時に取る今日の編成が使う項目。号車・車両は読まないので結合しない。 */
export const TODAYS_FORMATION_FIELDS: FormationFields = {
    formation: [
        'agencyId',
        'vehicleType',
        'formationNumber',
        'formationDescription',
        'startDate',
        'endDate',
    ],
};

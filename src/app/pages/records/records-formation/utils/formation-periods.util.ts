import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { Livery, toLivery } from '../constants/livery';

/** 車両の改造の記録 1 件（api の `vehicle.modifications[]` から使う項目）。 */
export interface ModificationRecord {
    modifiedOn: string | null;
    kind: string;
    value: string | null;
    description: string | null;
}

/** 車両番号ごとの改造の記録（`modifiedOn` の古い順で null が先）。`buildModificationHistory` の第 2 引数。 */
export type VehicleModifications = Readonly<
    Record<string, readonly ModificationRecord[]>
>;

export interface FormationCar {
    vehicleNumber: string;
    /** 期間の最後の日（今も続く期間なら今日）の時点の塗装 */
    livery: Livery | null;
}

export interface FormationPeriod {
    startDate: string | null;
    endDate: string | null;
    vehicleType: string;
    agencyName: string | null;
    cars: FormationCar[];
}

export interface ModificationEntry {
    modifiedOn: string | null;
    kind: string;
    value: string | null;
    description: string | null;
    vehicles: string[] | 'all';
}

const LIVERY_KIND = 'livery';

/**
 * その日（YYYY-MM-DD）までの塗装。種類 `livery` の記録のうち `modifiedOn` が
 * その日以前（null は最も古い扱い）で最新のものの値。表に無い値は null。
 */
export const liveryAt = (
    modifications: readonly ModificationRecord[] | undefined,
    date: string,
): Livery | null => {
    let latest: ModificationRecord | undefined;
    for (const m of modifications ?? []) {
        if (m.kind !== LIVERY_KIND) continue;
        if (m.modifiedOn !== null && m.modifiedOn > date) continue;
        if (
            !latest ||
            latest.modifiedOn === null ||
            (m.modifiedOn !== null && m.modifiedOn >= latest.modifiedOn)
        ) {
            latest = m;
        }
    }
    return toLivery(latest?.value);
};

/** 期間の新しい順（始まりの日が空の期間はいちばん古い）。 */
const compareNewestFirst = (a: FormationPeriod, b: FormationPeriod): number => {
    if (a.startDate === b.startDate) return 0;
    if (a.startDate === null) return 1;
    if (b.startDate === null) return -1;
    return a.startDate < b.startDate ? 1 : -1;
};

/** 編成番号の行から車両番号ごとの改造の記録を集める。 */
export const collectVehicleModifications = (
    rows: FormationDetailsDto[],
    formationNumber: string,
): VehicleModifications => {
    const result: Record<string, ModificationRecord[]> = {};
    for (const row of rows) {
        if (row.formationNumber !== formationNumber) continue;
        for (const vf of row.vehicleFormations ?? []) {
            if (!vf.vehicle) continue;
            result[vf.vehicle.vehicleNumber] = [
                ...(vf.vehicle.modifications ?? []),
            ];
        }
    }
    return result;
};

/**
 * その番号の行だけを、新しい期間から順に並べる。車両 0 両の行は除く。
 * `today` は今も続く期間（endDate が空）の塗装を決める日。
 */
export const buildFormationPeriods = (
    rows: FormationDetailsDto[],
    formationNumber: string,
    today: string,
): FormationPeriod[] =>
    rows
        .filter(
            (row) =>
                row.formationNumber === formationNumber &&
                (row.vehicleFormations ?? []).some((vf) => vf.vehicle),
        )
        .map((row): FormationPeriod => {
            const livedOn = row.endDate ?? today;
            const cars = [...(row.vehicleFormations ?? [])]
                .sort((a, b) => a.carNumber - b.carNumber)
                .flatMap((vf) =>
                    vf.vehicle
                        ? [
                              {
                                  vehicleNumber: vf.vehicle.vehicleNumber,
                                  livery: liveryAt(
                                      vf.vehicle.modifications,
                                      livedOn,
                                  ),
                              },
                          ]
                        : [],
                );
            return {
                // 続く期間の終わりの日などは、api が NULL の項目ごと省いて返す（api の ADR-0010）
                startDate: row.startDate ?? null,
                endDate: row.endDate ?? null,
                vehicleType: row.vehicleType,
                agencyName: row.agency?.agencyName ?? null,
                cars,
            };
        })
        .sort(compareNewestFirst);

/**
 * `date` を含む期間。無ければ `date` より前で最も新しい期間。
 * `periods` は新しい順。どの期間よりも前の日は null。
 */
export const periodAt = (
    periods: FormationPeriod[],
    date: string,
): FormationPeriod | null =>
    periods.find(
        (p) =>
            (p.startDate === null || p.startDate <= date) &&
            (p.endDate === null || date <= p.endDate),
    ) ??
    periods.find((p) => p.endDate !== null && p.endDate < date) ??
    null;

/** 1 つ古い期間に無い車両の番号。いちばん古い期間は空。 */
export const changedCars = (
    periods: FormationPeriod[],
    index: number,
): Set<string> => {
    const current = periods[index];
    const older = periods[index + 1];
    if (!current || !older) return new Set();
    const before = new Set(older.cars.map((c) => c.vehicleNumber));
    return new Set(
        current.cars.map((c) => c.vehicleNumber).filter((n) => !before.has(n)),
    );
};

/**
 * その組成の車両の記録を新しい順に（日付の無い記録は最後）。
 * 同じ日・種類・値・説明の記録が組成の全車両にあれば `vehicles` は 'all'。
 */
export const buildModificationHistory = (
    period: FormationPeriod,
    modifications: VehicleModifications,
): ModificationEntry[] => {
    const groups = new Map<
        string,
        { record: ModificationRecord; vehicles: string[] }
    >();
    for (const car of period.cars) {
        for (const m of modifications[car.vehicleNumber] ?? []) {
            const key = JSON.stringify([
                m.modifiedOn,
                m.kind,
                m.value,
                m.description,
            ]);
            const group = groups.get(key);
            if (!group) {
                groups.set(key, { record: m, vehicles: [car.vehicleNumber] });
            } else if (!group.vehicles.includes(car.vehicleNumber)) {
                group.vehicles.push(car.vehicleNumber);
            }
        }
    }
    return [...groups.values()]
        .map(({ record, vehicles }) => ({
            modifiedOn: record.modifiedOn,
            kind: record.kind,
            value: record.value,
            description: record.description,
            vehicles:
                vehicles.length === period.cars.length
                    ? ('all' as const)
                    : vehicles,
        }))
        .sort((a, b) => {
            if (a.modifiedOn === b.modifiedOn) return 0;
            if (a.modifiedOn === null) return 1;
            if (b.modifiedOn === null) return -1;
            return a.modifiedOn < b.modifiedOn ? 1 : -1;
        });
};

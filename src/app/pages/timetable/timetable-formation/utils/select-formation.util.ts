import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';

/**
 * 編成番号と日付（'yyyy-MM-dd'）から、その日に有効な編成を選ぶ。
 * 同じ番号で期間の違う行が複数ある（編成の組み替え）ので、期間に日付が入る行を取る。
 * 無ければ null。
 */
export function selectFormationOnDate(
    formations: FormationDetailsDto[],
    formationNumber: string,
    date: string,
): FormationDetailsDto | null {
    const candidates = formations.filter(
        (f) =>
            f.formationNumber === formationNumber &&
            (!f.startDate || f.startDate.slice(0, 10) <= date) &&
            (!f.endDate || date <= f.endDate.slice(0, 10)),
    );
    if (candidates.length === 0) return null;
    // 期間が重なっていたら、あとから始まった行を優先する
    return candidates.reduce((latest, f) =>
        (f.startDate ?? '') > (latest.startDate ?? '') ? f : latest,
    );
}

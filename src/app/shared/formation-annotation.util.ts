import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';

/**
 * 編成の「形式・所属会社」付記を組み立てる（設計書 §5.2 / mockup-02 の「10000・相鉄」）。
 * vehicleType は素の形式番号（例: 10000）をそのまま会社名と「・」で連結する。
 * どちらか一方しか無ければその一方だけ、両方無ければ空文字。
 *
 * docs/design.md「主データと修飾は縦に分ける」の修飾側。編成番号の下段に置く。
 */
export function formatFormationAnnotation(
    formation:
        | Pick<FormationDetailsDto, 'agencyId' | 'vehicleType'>
        | undefined,
    agencies: readonly AgencyDetailsDto[],
): string {
    if (!formation) {
        return '';
    }
    const agencyName = formation.agencyId
        ? agencies.find((a) => a.agencyId === formation.agencyId)?.agencyName
        : undefined;
    return [formation.vehicleType, agencyName]
        .filter((part) => !!part)
        .join('・');
}

import { addDays, getHours, parse, subDays } from 'date-fns';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';

/** 今の submit と同じ換算（4 時の境目）。currentTime なら now をそのまま ISO に */
export function toSightingTimeIso(params: {
    timeSetting: 'currentTime' | 'specifiedTime';
    sightingTime: string;
    now: Date;
}): string {
    const { timeSetting, sightingTime, now } = params;
    if (timeSetting !== 'specifiedTime') return now.toISOString();

    const parsedSightingTime = parse(sightingTime, 'HH:mm', now);
    const isLateNight = getHours(now) < 4;

    const adjustedSightingTime = isLateNight
        ? subDays(parsedSightingTime, getHours(parsedSightingTime) >= 4 ? 1 : 0)
        : addDays(parsedSightingTime, getHours(parsedSightingTime) < 4 ? 1 : 0);

    return adjustedSightingTime.toISOString();
}

export type SightingBlockReason = 'future_time' | 'operation_not_found';

export const SIGHTING_BLOCK_MESSAGES: Record<SightingBlockReason, string> = {
    future_time: '未来の時刻は指定できません',
    operation_not_found: '指定された運用番号の運用情報が見つかりません',
};

export const FORMATION_NOT_IN_TODAY_MESSAGE =
    '今日の編成に無い番号です（車両番号ならそのまま送れます）';

/** 休車。今日の一覧には出ないが、手で打つのは止めない */
const NO_TRIP_OPERATION_NUMBER = '100';

export function findSightingBlockers(params: {
    operationNumber: string;
    sightingTimeIso: string;
    now: Date;
    /** 空なら運用番号は確かめない */
    todaysOperationNumbers: readonly string[];
}): SightingBlockReason[] {
    const { operationNumber, sightingTimeIso, now, todaysOperationNumbers } =
        params;
    const reasons: SightingBlockReason[] = [];

    if (new Date(sightingTimeIso).getTime() > now.getTime()) {
        reasons.push('future_time');
    }
    if (
        todaysOperationNumbers.length > 0 &&
        operationNumber !== NO_TRIP_OPERATION_NUMBER &&
        !todaysOperationNumbers.includes(operationNumber)
    ) {
        reasons.push('operation_not_found');
    }
    return reasons;
}

/** 注意を出すか。todaysFormations が空・formationOrVehicleNumber が空なら false */
export function isFormationNotInToday(params: {
    agencyId: string;
    formationOrVehicleNumber: string;
    todaysFormations: readonly Pick<
        FormationDetailsDto,
        'agencyId' | 'formationNumber'
    >[];
}): boolean {
    const { agencyId, todaysFormations } = params;
    const input = params.formationOrVehicleNumber.trim();
    if (input === '' || todaysFormations.length === 0) return false;

    return !todaysFormations.some(
        (formation) =>
            (agencyId === '' || formation.agencyId === agencyId) &&
            formation.formationNumber === input,
    );
}

import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';

/**
 * URL の trip_direction を向きとして読む。"0"・"1" 以外（無い・"abc"・"2" など）は null。
 * `Number(null)` は 0、`Number('abc')` は NaN になり、そのまま API に送ると
 * 上りにすり替わるか 422 になるので、読む所はすべてこれを通す（2026-10-12）。
 */
export function parseTripDirectionParam(
    raw: string | null,
): ETripDirection | null {
    if (raw === String(ETripDirection.INBOUND)) return ETripDirection.INBOUND;
    if (raw === String(ETripDirection.OUTBOUND)) return ETripDirection.OUTBOUND;
    return null;
}

import { ETripDirection } from '../enums/trip.enum';

export const tripDirectionLabel = new Map<ETripDirection, string>([
    [ETripDirection.INBOUND, '上り'],
    [ETripDirection.OUTBOUND, '下り'],
]);

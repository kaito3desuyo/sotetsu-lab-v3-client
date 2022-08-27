import { IStation } from 'src/app/general/interfaces/station';

export interface ITimetableStation extends IStation {
    viewMode?: ETimetableStationViewMode;
    borderSetting?: boolean;
}

export const ETimetableStationViewMode = {
    ONLY_DEPARTURE: 0,
    ONLY_INBOUND_ARRIVAL: 1,
    ONLY_OUTBOUND_ARRIVAL: 2,
    DEPARTURE_AND_ARRIVAL: 3,
} as const;
export type ETimetableStationViewMode =
    typeof ETimetableStationViewMode[keyof typeof ETimetableStationViewMode];

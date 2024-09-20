export const ETimetableAllLineStationViewMode = {
    ONLY_DEPARTURE: 0,
    ONLY_INBOUND_ARRIVAL: 1,
    ONLY_OUTBOUND_ARRIVAL: 2,
    DEPARTURE_AND_ARRIVAL: 3,
} as const;
export type ETimetableAllLineStationViewMode =
    (typeof ETimetableAllLineStationViewMode)[keyof typeof ETimetableAllLineStationViewMode];

export interface StopDetailsDto {
    stopId: string;

    stationId: string;

    stopName: string;

    stopDescription: string | null;

    stopLatlng: string | null;

    zoneId: string | null;

    createdAt: string;

    updatedAt: string;
}

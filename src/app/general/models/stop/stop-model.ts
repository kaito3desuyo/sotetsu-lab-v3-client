import { ReadStopDto } from './stop-dto';
import { IStop } from './stop';

export class StopModel {
    static readStopDtoImpl(data: ReadStopDto): IStop {
        const parsed: IStop = {
            id: data.id,
            stationId: data.station_id,
            stopName: data.stop_name,
            stopDescription: data.stop_description,
            stopLatLng: data.stop_latlng,
            zoneId: data.zone_id,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };

        return parsed;
    }
}

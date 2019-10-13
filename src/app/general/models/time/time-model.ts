import { ReadTimeDto } from './time-dto';
import { ITime } from '../../interfaces/time';

export class TimeModel {
    static readTimeDtoImpl(data: ReadTimeDto): ITime {
        const parsed: ITime = {
            id: data.id,
            tripId: data.trip_id,
            stationId: data.station_id,
            stopId: data.stop_id,
            stopSequence: data.stop_sequence,
            pickupType: data.pickup_type,
            dropoffType: data.dropoff_type,
            arrivalDays: data.arrival_days,
            arrivalTime: data.arrival_time,
            departureDays: data.departure_days,
            departureTime: data.departure_time,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        }

        return parsed
    }
}

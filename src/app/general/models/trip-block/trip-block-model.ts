import { ReadTripBlockDto } from './trip-block-dto';
import { ITripBlock } from './trip-block';
import { TripModel } from '../trip/trip-model';

export class TripBlockModel {
    static readTripBlockDtoImpl(data: ReadTripBlockDto): ITripBlock {
        const parsed: ITripBlock = {
            id: data.id,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };

        if (data.trips) {
            parsed.trips = data.trips.map((trip) =>
                TripModel.readTripDtoImpl(trip)
            );
        }

        return parsed;
    }
}

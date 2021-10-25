import { ReadTripDto, CreateTripDto } from '../trip/trip-dto';

/* eslint-disable @typescript-eslint/naming-convention, no-underscore-dangle, id-denylist, id-match */
export class ReadTripBlockDto {
    id: string;
    created_at: string;
    updated_at: string;
    trips?: ReadTripDto[];
}

export class CreateTripBlockDto {
    trips: CreateTripDto[];
}

export class UpdateTripBlockDto {
    trips: CreateTripDto[];
}

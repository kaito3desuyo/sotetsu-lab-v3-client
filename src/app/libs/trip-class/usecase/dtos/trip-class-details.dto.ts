import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

export interface TripClassDetailsDto {
    tripClassId: string;

    serviceId?: string;

    tripClassName?: string;

    tripClassColor?: string;

    sequence?: number;

    createdAt?: string;

    updatedAt?: string;

    trips?: TripDetailsDto[];

    // service?: ServiceMOde;
}

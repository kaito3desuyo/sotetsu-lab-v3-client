import { ReplaceTripDto } from 'src/app/libs/trip/usecase/dtos/replace-trip.dto';

export interface ReplaceTripBlockDto {
    tripBlockId: string;
    trips: ReplaceTripDto[];
}

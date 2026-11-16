import {
    TripDetailsDto,
    TripWithTimesDto,
} from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

export interface TripBlockDetailsDto {
    tripBlockId: string;

    createdAt?: string;

    updatedAt?: string;

    trips?: TripDetailsDto[];
}

/** 時刻表の取得で trips（と各 trip の times）を付けて取った運行ブロック。API が必ず付ける */
export interface TripBlockWithTripsDto extends TripBlockDetailsDto {
    trips: TripWithTimesDto[];
}

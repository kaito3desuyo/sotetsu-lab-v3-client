import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TripBlockCommand } from '../infrastructure/commands/trip-block.command';
import { TripBlockQuery } from '../infrastructure/queries/trip-block.query';
import { AddTripToTripBlockDto } from './dtos/add-trip-to-trip-block.dto';
import { CreateTripBlockDto } from './dtos/create-trip-block.dto';
import { DeleteTripFromTripBlockDto } from './dtos/delete-trip-from-trip-block.dto';
import { ReplaceTripBlockDto } from './dtos/replace-trip-block.dto';
import { TripBlockDetailsDto } from './dtos/trip-block-details.dto';

@Injectable({ providedIn: 'root' })
export class TripBlockService {
    constructor(
        private readonly tripBlockCommand: TripBlockCommand,
        private readonly tripBlockQuery: TripBlockQuery,
    ) {}

    findManyByFilter_V3(params: {
        calendarId: string;
        tripDirection: number;
        forceReload?: boolean;
    }): Observable<TripBlockDetailsDto[]> {
        return this.tripBlockQuery.findManyByFilter_V3(params);
    }

    findOneById_V3(params: {
        id: string;
        forceReload?: boolean;
    }): Observable<TripBlockDetailsDto> {
        return this.tripBlockQuery.findOneById_V3(params);
    }

    createMany_V3(body: CreateTripBlockDto[]): Observable<TripBlockDetailsDto[]> {
        return this.tripBlockCommand.createMany_V3(body);
    }

    replaceOne_V3(
        tripBlockId: string,
        body: ReplaceTripBlockDto,
    ): Observable<TripBlockDetailsDto> {
        return this.tripBlockCommand.replaceOne_V3(tripBlockId, body);
    }

    addTripToTripBlock_V3(
        tripBlockId: string,
        body: AddTripToTripBlockDto,
    ): Observable<TripBlockDetailsDto> {
        return this.tripBlockCommand.addTripToTripBlock_V3(tripBlockId, body);
    }

    deleteTripFromTripBlock_V3(
        tripBlockId: string,
        body: DeleteTripFromTripBlockDto,
    ): Observable<TripBlockDetailsDto> {
        return this.tripBlockCommand.deleteTripFromTripBlock_V3(
            tripBlockId,
            body,
        );
    }
}

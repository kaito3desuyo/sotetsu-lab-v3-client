import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { Pagination } from 'src/app/core/utils/pagination';
import { TripBlockCommand } from '../infrastructure/commands/trip-block.command';
import { TripBlockQuery } from '../infrastructure/queries/trip-block.query';
import { CreateTripBlockDto } from './dtos/create-trip-block.dto';
import { TripBlockDetailsDto } from './dtos/trip-block-details.dto';

@Injectable({ providedIn: 'root' })
export class TripBlockService {
    constructor(
        private readonly tripBlockCommand: TripBlockCommand,
        private readonly tripBlockQuery: TripBlockQuery
    ) {}

    findMany(
        qb: RequestQueryBuilder
    ): Observable<Pagination<TripBlockDetailsDto> | TripBlockDetailsDto[]> {
        return this.tripBlockQuery.findMany(qb);
    }

    createMany(
        qb: RequestQueryBuilder,
        body: CreateTripBlockDto[]
    ): Observable<Pagination<TripBlockDetailsDto> | TripBlockDetailsDto[]> {
        return this.tripBlockCommand.createMany(qb, body);
    }
}

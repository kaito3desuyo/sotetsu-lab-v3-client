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

    findManyByFilter(params: {
        calendarId: string;
        tripDirection: number;
        forceReload?: boolean;
    }): Observable<TripBlockDetailsDto[]> {
        return this.tripBlockQuery.findManyByFilter(params);
    }

    /**
     * 指定 calendarId の上下（tripDirection=0/1）バルクデータをまとめて取得する。
     * N1/N2/N3 が同一メソッドを呼べばキャッシュが効き、ページ間遷移で再取得しない。
     */
    findManyByCalendarId(params: {
        calendarId: string;
        forceReload?: boolean;
    }): Observable<Record<number, TripBlockDetailsDto[]>> {
        return this.tripBlockQuery.findManyByCalendarId(params);
    }

    /** ダイヤ改正等でバルクキャッシュ（findManyByFilter / findManyByCalendarId）を失効させる。 */
    invalidateAll(): void {
        this.tripBlockQuery.invalidateAll();
    }

    findOneById(params: {
        id: string;
        forceReload?: boolean;
    }): Observable<TripBlockDetailsDto> {
        return this.tripBlockQuery.findOneById(params);
    }

    createMany(body: CreateTripBlockDto[]): Observable<TripBlockDetailsDto[]> {
        return this.tripBlockCommand.createMany(body);
    }

    replaceOne(
        tripBlockId: string,
        body: ReplaceTripBlockDto,
    ): Observable<TripBlockDetailsDto> {
        return this.tripBlockCommand.replaceOne(tripBlockId, body);
    }

    addTripToTripBlock(
        tripBlockId: string,
        body: AddTripToTripBlockDto,
    ): Observable<TripBlockDetailsDto> {
        return this.tripBlockCommand.addTripToTripBlock(tripBlockId, body);
    }

    deleteTripFromTripBlock(
        tripBlockId: string,
        body: DeleteTripFromTripBlockDto,
    ): Observable<TripBlockDetailsDto> {
        return this.tripBlockCommand.deleteTripFromTripBlock(
            tripBlockId,
            body,
        );
    }
}

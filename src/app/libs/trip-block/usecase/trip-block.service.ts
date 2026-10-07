import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { TripBlockCommand } from '../infrastructure/commands/trip-block.command';
import { TripBlockQuery } from '../infrastructure/queries/trip-block.query';
import { TripBlockFields } from './trip-block-fields';
import { AddTripToTripBlockDto } from './dtos/add-trip-to-trip-block.dto';
import { CreateTripBlockDto } from './dtos/create-trip-block.dto';
import { DeleteTripFromTripBlockDto } from './dtos/delete-trip-from-trip-block.dto';
import { ReplaceTripBlockDto } from './dtos/replace-trip-block.dto';
import { TripBlockDetailsDto } from './dtos/trip-block-details.dto';

@Injectable({ providedIn: 'root' })
export class TripBlockService {
    private readonly tripBlockCommand = inject(TripBlockCommand);
    private readonly tripBlockQuery = inject(TripBlockQuery);

    readonly #queryInvalidator = inject(QueryInvalidator);

    findManyByFilter(params: {
        calendarId: string;
        tripDirection: number;
        fields?: TripBlockFields;
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
        fields?: TripBlockFields;
        forceReload?: boolean;
    }): Observable<Record<number, TripBlockDetailsDto[]>> {
        return this.tripBlockQuery.findManyByCalendarId(params);
    }

    findOneById(params: {
        id: string;
        forceReload?: boolean;
    }): Observable<TripBlockDetailsDto> {
        return this.tripBlockQuery.findOneById(params);
    }

    createMany(body: CreateTripBlockDto[]): Observable<TripBlockDetailsDto[]> {
        return this.tripBlockCommand
            .createMany(body)
            .pipe(tap(() => this.#queryInvalidator.invalidate('timetable')));
    }

    replaceOne(
        tripBlockId: string,
        body: ReplaceTripBlockDto,
    ): Observable<TripBlockDetailsDto> {
        return this.tripBlockCommand
            .replaceOne(tripBlockId, body)
            .pipe(tap(() => this.#queryInvalidator.invalidate('timetable')));
    }

    addTripToTripBlock(
        tripBlockId: string,
        body: AddTripToTripBlockDto,
    ): Observable<TripBlockDetailsDto> {
        return this.tripBlockCommand
            .addTripToTripBlock(tripBlockId, body)
            .pipe(tap(() => this.#queryInvalidator.invalidate('timetable')));
    }

    deleteTripFromTripBlock(
        tripBlockId: string,
        body: DeleteTripFromTripBlockDto,
    ): Observable<TripBlockDetailsDto> {
        return this.tripBlockCommand
            .deleteTripFromTripBlock(tripBlockId, body)
            .pipe(tap(() => this.#queryInvalidator.invalidate('timetable')));
    }
}

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AddTripToTripBlockDto } from '../../usecase/dtos/add-trip-to-trip-block.dto';
import { CreateTripBlockDto } from '../../usecase/dtos/create-trip-block.dto';
import { DeleteTripFromTripBlockDto } from '../../usecase/dtos/delete-trip-from-trip-block.dto';
import { ReplaceTripBlockDto } from '../../usecase/dtos/replace-trip-block.dto';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto';
import { TripBlockDtoBuilder } from '../builders/trip-block.dto.builder';
import { TripBlockModelBuilder } from '../builders/trip-block.model.builder';
import { TripBlockModel } from '../models/trip-block.model';

@Injectable({ providedIn: 'root' })
export class TripBlockCommand {
    readonly #v3ApiUrl = environment.apiUrl + '/v3/trip-blocks';

    constructor(private readonly http: HttpClient) {}

    createMany(
        body: CreateTripBlockDto[],
    ): Observable<TripBlockDetailsDto[]> {
        return this.http
            .post<TripBlockModel[]>(
                `${this.#v3ApiUrl}/bulk`,
                body.map((o) => TripBlockModelBuilder.buildFromCreateDto(o)),
                { observe: 'response' },
            )
            .pipe(
                map((res) =>
                    res.body.map((o) => TripBlockDtoBuilder.buildFromModel(o)),
                ),
            );
    }

    replaceOne(
        tripBlockId: string,
        body: ReplaceTripBlockDto,
    ): Observable<TripBlockDetailsDto> {
        return this.http
            .put<TripBlockModel>(
                `${this.#v3ApiUrl}/${tripBlockId}`,
                TripBlockModelBuilder.buildFromReplaceDto(body),
                { observe: 'response' },
            )
            .pipe(map((res) => TripBlockDtoBuilder.buildFromModel(res.body)));
    }

    addTripToTripBlock(
        tripBlockId: string,
        body: AddTripToTripBlockDto,
    ): Observable<TripBlockDetailsDto> {
        return this.http
            .patch<TripBlockModel>(
                `${this.#v3ApiUrl}/${tripBlockId}/add-trip`,
                body,
                { observe: 'response' },
            )
            .pipe(map((res) => TripBlockDtoBuilder.buildFromModel(res.body)));
    }

    deleteTripFromTripBlock(
        tripBlockId: string,
        body: DeleteTripFromTripBlockDto,
    ): Observable<TripBlockDetailsDto> {
        return this.http
            .patch<TripBlockModel>(
                `${this.#v3ApiUrl}/${tripBlockId}/delete-trip`,
                body,
                { observe: 'response' },
            )
            .pipe(map((res) => TripBlockDtoBuilder.buildFromModel(res.body)));
    }
}

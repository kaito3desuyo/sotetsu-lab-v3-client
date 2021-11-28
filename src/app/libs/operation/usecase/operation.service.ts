import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { Pagination } from 'src/app/core/utils/pagination';
import { OperationQuery } from '../infrastructure/queries/operation.query';
import { OperationDetailsDto } from './dtos/operation-details.dto';

@Injectable({ providedIn: 'root' })
export class OperationService {
    constructor(private readonly operationQuery: OperationQuery) {}

    findMany(
        qb: RequestQueryBuilder
    ): Observable<Pagination<OperationDetailsDto> | OperationDetailsDto[]> {
        return this.operationQuery.findMany(qb);
    }
}

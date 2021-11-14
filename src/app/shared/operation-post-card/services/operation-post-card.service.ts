import { Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import dayjs from 'dayjs';
import { Observable, of } from 'rxjs';
import { map, mergeMap, tap } from 'rxjs/operators';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import { IOperationPostCardForm } from '../interfaces/operation-post-card-form.interface';

@Injectable()
export class OperationPostCardService {
    constructor(private readonly formationService: FormationService) {}

    addOperationSighting(formValue: IOperationPostCardForm): Observable<void> {
        const formationQb = RequestQueryBuilder.create()
            .setJoin([
                { field: 'vehicleFormations' },
                { field: 'vehicleFormations.vehicle' },
            ])
            .search({
                $or: [
                    {
                        formationNumber: {
                            [CondOperator.EQUALS]:
                                formValue.formationOrVehicleNumber,
                        },
                    },
                    {
                        'vehicleFormations.vehicle.vehicleNumber': {
                            [CondOperator.EQUALS]:
                                formValue.formationOrVehicleNumber,
                        },
                    },
                ],
            });

        return of(null).pipe(
            mergeMap(() =>
                this.formationService.findManyBySpeficicDate(formationQb, {
                    date: dayjs()
                        .subtract(dayjs().hour() < 4 ? 1 : 0, 'days')
                        .format('YYYY-MM-DD'),
                })
            ),
            tap((data: FormationDetailsDto[]) => {
                if (!data.length) {
                    throw new Error('存在しない編成・車両番号です');
                }
            }),
            map(() => null)
        );
    }
}

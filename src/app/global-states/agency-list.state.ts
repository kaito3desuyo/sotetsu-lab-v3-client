import { inject } from '@angular/core';
import {
    patchState,
    signalStore,
    type,
    withComputed,
    withMethods,
} from '@ngrx/signals';
import {
    entityConfig,
    setAllEntities,
    withEntities,
} from '@ngrx/signals/entities';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { withAppDevtools } from '../core/store-features/with-app-devtools';
import { AgencyService } from '../libs/agency/usecase/agency.service';
import { AgencyDetailsDto } from '../libs/agency/usecase/dtos/agency-details.dto';

const agencyConfig = entityConfig({
    entity: type<AgencyDetailsDto>(),
    selectId: (agency) => agency.agencyId,
});

export const AgencyListState = signalStore(
    { providedIn: 'root' },
    withEntities(agencyConfig),
    withComputed(({ entities }) => ({
        /** 取得した順の会社 */
        agencies: entities,
    })),
    withMethods((store) => {
        const agencyService = inject(AgencyService);

        return {
            fetch(): Observable<void> {
                return agencyService.findMany().pipe(
                    tap((data: AgencyDetailsDto[]) => {
                        patchState(store, setAllEntities(data, agencyConfig));
                    }),
                    map(() => undefined),
                );
            },
        };
    }),
    withAppDevtools('AgencyListState'),
);

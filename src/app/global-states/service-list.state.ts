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
import { ServiceDetailsDto } from '../libs/service/usecase/dtos/service-details.dto';
import { ServiceService } from '../libs/service/usecase/service.service';

const serviceConfig = entityConfig({
    entity: type<ServiceDetailsDto>(),
    selectId: (service) => service.serviceId,
});

export const ServiceListState = signalStore(
    { providedIn: 'root' },
    withEntities(serviceConfig),
    withComputed(({ entities }) => ({
        /** 先頭の運行系統の ID（取得前は undefined） */
        serviceId: () => entities()[0]?.serviceId,
    })),
    withMethods((store) => {
        const serviceService = inject(ServiceService);

        return {
            fetch(): Observable<void> {
                return serviceService
                    .findMany({
                        serviceName:
                            '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
                    })
                    .pipe(
                        tap((data: ServiceDetailsDto[]) => {
                            patchState(
                                store,
                                setAllEntities(data, serviceConfig),
                            );
                        }),
                        map(() => undefined),
                    );
            },
        };
    }),
    withAppDevtools('ServiceListState'),
);

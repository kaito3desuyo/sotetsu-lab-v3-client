import { createStore, select, setProp, withProps } from '@ngneat/elf';
import { persistState } from '@ngneat/elf-persist-state';
import localForage from 'localforage';
import { debounceTime } from 'rxjs';
import { ServiceAgenciesDto } from 'src/app/libs/service/usecase/dtos/service-agencies.dto';

type StoreProps = {
    serviceAgencies: ServiceAgenciesDto;
};

const store = createStore(
    { name: 'OperationPostCardStore' },
    withProps<StoreProps>({
        serviceAgencies: null,
    }),
);

const persist = persistState(store, {
    key: 'OperationPostCardStore',
    storage: localForage,
    source: () => store.pipe(debounceTime(100)),
});

export const OperationPostCardStore = {
    persistInitialized$: persist.initialized$,

    setServiceAgencies(serviceAgencies: ServiceAgenciesDto): void {
        store.update(setProp('serviceAgencies', () => serviceAgencies));
    },

    agencies$: store.pipe(
        select((state) => {
            if (!state.serviceAgencies) {
                return [];
            }

            const index = {
                相鉄: 0,
                JR東日本: 1,
                東急: 2,
                横高: 3,
                東臨: 4,
                東京メトロ: 5,
                東武: 6,
                埼玉高速: 7,
                都営: 8,
            };

            return state.serviceAgencies.agencies.sort(
                (a, b) => index[a.agencyName] - index[b.agencyName],
            );
        }),
    ),
} as const;

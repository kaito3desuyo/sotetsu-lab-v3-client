import { createStore, select, setProp, withProps } from '@ngneat/elf';
import { persistState } from '@ngneat/elf-persist-state';
import localForage from 'localforage';
import { debounceTime, map } from 'rxjs';
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
        select((state) => state.serviceAgencies?.agencies ?? []),
        map((agencies) => {
            const index: Record<string, number> = {
                相鉄: 0,
                JR東日本: 1,
                東急: 2,
                横高: 3,
                東臨: 4,
                東京メトロ: 5,
                東武: 6,
                埼玉高速: 7,
                都営: 8,
                西武: 9,
            };

            const getOrder = (agencyName: string): number =>
                index[agencyName] ?? Number.MAX_SAFE_INTEGER;

            return [...agencies].sort((a, b) => {
                const orderDiff =
                    getOrder(a.agencyName) - getOrder(b.agencyName);

                if (orderDiff !== 0) {
                    return orderDiff;
                }

                return a.agencyName.localeCompare(b.agencyName, 'ja');
            });
        }),
    ),
} as const;

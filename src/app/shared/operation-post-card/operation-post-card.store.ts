import { computed } from '@angular/core';
import {
    patchState,
    signalStore,
    withComputed,
    withMethods,
    withState,
} from '@ngrx/signals';
import { withAppDevtools } from 'src/app/core/store-features/with-app-devtools';
import { withSettingsStorage } from 'src/app/core/store-features/with-settings-storage';
import { ServiceAgenciesDto } from 'src/app/libs/service/usecase/dtos/service-agencies.dto';

type StoreProps = {
    serviceAgencies: ServiceAgenciesDto;
};

const initialState: StoreProps = {
    serviceAgencies: null,
};

export const OperationPostCardStore = signalStore(
    { providedIn: 'root' },
    withState<StoreProps>(initialState),
    withComputed(({ serviceAgencies }) => ({
        agencies: computed(() => {
            const agencies = serviceAgencies()?.agencies ?? [];
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
    })),
    withMethods((store) => ({
        setServiceAgencies(serviceAgencies: ServiceAgenciesDto): void {
            patchState(store, { serviceAgencies });
        },
    })),
    withSettingsStorage<StoreProps>({
        key: 'OperationPostCardStore',
        fields: ['serviceAgencies'],
        debounceMs: 100,
    }),
    withAppDevtools('OperationPostCardStore'),
);

/**
 * 所属の選択肢を、今日の編成を持つ会社だけに絞る（2026-10-06）。投稿は編成番号を
 * その会社の編成から探すので、編成の無い会社は選んでも投稿できない。
 * 編成をまだ取れていない（空の）ときは絞らない（選べる会社が無くなるのを避ける）。
 */
export function filterAgenciesWithFormations<T extends { agencyId: string }>(
    agencies: readonly T[],
    formations: readonly { agencyId?: string }[],
): T[] {
    const agencyIds = new Set(
        formations.map((formation) => formation.agencyId),
    );
    if (agencyIds.size === 0) return [...agencies];
    return agencies.filter((agency) => agencyIds.has(agency.agencyId));
}

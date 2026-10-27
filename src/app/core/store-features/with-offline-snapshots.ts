import { inject } from '@angular/core';
import { signalStoreFeature, withMethods } from '@ngrx/signals';

import {
    OfflineConditions,
    OfflineSnapshot,
    OfflineSnapshots,
} from '../offline/offline-snapshots';

export interface OfflineSnapshotDef<T> {
    key: string;
    /** 保存する中身を、いまのストアから取り出す */
    select: () => T;
    /** 戻した中身を、ストアに入れる */
    apply: (data: T, savedAt: number) => void;
}

/**
 * 圏外用の保存（OfflineSnapshots）を、ストアの名前付きメソッドにする。
 * apply が投げた例外は、呼び手へそのまま返る。
 */
export function withOfflineSnapshots<Name extends string>(
    defs: Record<Name, OfflineSnapshotDef<any>>,
) {
    return signalStoreFeature(
        withMethods(() => {
            const snapshots = inject(OfflineSnapshots);

            return {
                saveOfflineSnapshot(
                    name: Name,
                    conditions: OfflineConditions,
                ): Promise<void> {
                    const def = defs[name];

                    return snapshots.save({
                        key: def.key,
                        conditions,
                        data: def.select(),
                    });
                },
                restoreOfflineSnapshot(
                    name: Name,
                    conditions: OfflineConditions,
                ): Promise<OfflineSnapshot<unknown> | null> {
                    const def = defs[name];

                    return snapshots.restore({
                        key: def.key,
                        conditions,
                        apply: def.apply,
                    });
                },
            };
        }),
    );
}

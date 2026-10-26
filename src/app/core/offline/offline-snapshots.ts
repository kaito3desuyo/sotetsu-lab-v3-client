import { isPlatformServer } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import localForage from 'localforage';

import { NotificationService } from '../services/notification.service';
import { formatSavedAt } from './format-saved-at.util';

export const OFFLINE_SNAPSHOT_VERSION = 1;

export type OfflineConditions = Readonly<
    Record<string, string | number | boolean | null>
>;

export interface OfflineSnapshot<T> {
    version: number;
    conditions: OfflineConditions;
    /** epoch ミリ秒 */
    savedAt: number;
    data: T;
}

const KEY_PREFIX = 'offline-snapshot:';

const isSameConditions = (
    saved: OfflineConditions,
    current: OfflineConditions,
): boolean => {
    const savedKeys = Object.keys(saved);
    const currentKeys = Object.keys(current);

    return (
        savedKeys.length === currentKeys.length &&
        currentKeys.every(
            (key) => Object.hasOwn(saved, key) && saved[key] === current[key],
        )
    );
};

/**
 * 取得に成功したページの中身を端末に保存し、通信に失敗したときだけ戻して知らせる。
 */
@Injectable({ providedIn: 'root' })
export class OfflineSnapshots {
    readonly #isServer = isPlatformServer(inject(PLATFORM_ID));
    readonly #notification = inject(NotificationService);

    async save<T>(params: {
        key: string;
        conditions: OfflineConditions;
        data: T;
    }): Promise<void> {
        if (this.#isServer) {
            return;
        }

        const snapshot: OfflineSnapshot<T> = {
            version: OFFLINE_SNAPSHOT_VERSION,
            conditions: params.conditions,
            savedAt: Date.now(),
            data: params.data,
        };

        try {
            await localForage.setItem(`${KEY_PREFIX}${params.key}`, snapshot);
        } catch {
            // 保存できなくても画面は動くので握りつぶす
        }
    }

    async restore<T>(params: {
        key: string;
        conditions: OfflineConditions;
        apply: (data: T, savedAt: number) => void;
    }): Promise<OfflineSnapshot<T> | null> {
        if (this.#isServer) {
            return null;
        }

        let snapshot: OfflineSnapshot<T> | null;
        try {
            snapshot = await localForage.getItem<OfflineSnapshot<T>>(
                `${KEY_PREFIX}${params.key}`,
            );
        } catch {
            return null;
        }

        if (
            !snapshot ||
            snapshot.version !== OFFLINE_SNAPSHOT_VERSION ||
            !isSameConditions(snapshot.conditions, params.conditions)
        ) {
            return null;
        }

        params.apply(snapshot.data, snapshot.savedAt);
        this.#notification.open(
            `通信できないため、${formatSavedAt(snapshot.savedAt, Date.now())}に保存した内容を表示しています`,
            'OK',
        );

        return snapshot;
    }
}

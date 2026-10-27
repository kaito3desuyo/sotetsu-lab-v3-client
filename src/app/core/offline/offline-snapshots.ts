import { isPlatformServer } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

import { NotificationService } from '../services/notification.service';
import { DeviceStorage } from '../storage/device-storage';
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
    readonly #storage = inject(DeviceStorage);
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

        // 保存できなくても画面は動くので、失敗は DeviceStorage が握りつぶす
        await this.#storage.setItem({
            key: `${KEY_PREFIX}${params.key}`,
            value: snapshot,
        });
    }

    async restore<T>(params: {
        key: string;
        conditions: OfflineConditions;
        apply: (data: T, savedAt: number) => void;
    }): Promise<OfflineSnapshot<T> | null> {
        if (this.#isServer) {
            return null;
        }

        const snapshot = await this.#storage.getItem<OfflineSnapshot<T>>(
            `${KEY_PREFIX}${params.key}`,
        );

        if (
            !snapshot ||
            snapshot.version !== OFFLINE_SNAPSHOT_VERSION ||
            // 端末に残った値が壊れていても、例外を投げずに戻さないだけにする
            typeof snapshot.conditions !== 'object' ||
            snapshot.conditions === null ||
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

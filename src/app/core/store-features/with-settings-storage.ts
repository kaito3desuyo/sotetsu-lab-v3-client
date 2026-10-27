import { isPlatformServer } from '@angular/common';
import {
    DestroyRef,
    Injector,
    PLATFORM_ID,
    inject,
    signal,
} from '@angular/core';
import {
    getState,
    patchState,
    signalStoreFeature,
    type,
    watchState,
    withHooks,
    withProps,
} from '@ngrx/signals';

import { DeviceStorage } from '../storage/device-storage';

/**
 * 画面の設定（fields）を端末に保存し、起動時に戻す。
 * 読み込みが済むまでは書かない。サーバーでは読み書きせず、最初から ready とする。
 */
export function withSettingsStorage<State extends object>(config: {
    key: string;
    fields: readonly (keyof State)[];
    debounceMs?: number;
}) {
    const { key, fields, debounceMs = 0 } = config;

    const pick = (state: State): Record<string, unknown> => {
        const picked: Record<string, unknown> = {};
        for (const field of fields) {
            picked[field as string] = state[field];
        }

        return picked;
    };

    return signalStoreFeature(
        { state: type<State>() },
        withProps(() => {
            const ready = signal(isPlatformServer(inject(PLATFORM_ID)));

            return {
                settingsReady: ready.asReadonly(),
                _settingsReady: ready,
            };
        }),
        withHooks((store) => {
            const storage = inject(DeviceStorage);
            const injector = inject(Injector);
            const destroyRef = inject(DestroyRef);
            const isServer = isPlatformServer(inject(PLATFORM_ID));
            let destroyed = false;
            let timer: ReturnType<typeof setTimeout> | undefined;

            destroyRef.onDestroy(() => {
                destroyed = true;
                clearTimeout(timer);
            });

            const write = (): Promise<void> =>
                storage.setItem({
                    key,
                    value: pick(getState(store) as State),
                });

            const load = async (): Promise<void> => {
                const saved =
                    await storage.getItem<Record<string, unknown>>(key);
                if (destroyed) {
                    return;
                }

                let hasOtherKeys = false;
                if (saved !== null && typeof saved === 'object') {
                    const restored: Record<string, unknown> = {};
                    for (const field of fields as readonly string[]) {
                        if (
                            Object.hasOwn(saved, field) &&
                            saved[field] !== undefined
                        ) {
                            restored[field] = saved[field];
                        }
                    }
                    patchState(store, restored as Partial<State>);
                    hasOtherKeys = Object.keys(saved).some(
                        (k) => !(fields as readonly string[]).includes(k),
                    );
                }

                let last = JSON.stringify(pick(getState(store) as State));
                store._settingsReady.set(true);

                // 変更のたびにやるのはタイマーの掛け直しだけ。
                // 文字列にするのは間引きが明けたときの 1 回にする（入力のたびに重くしない）
                watchState(
                    store,
                    () => {
                        clearTimeout(timer);
                        timer = setTimeout(() => {
                            const serialized = JSON.stringify(
                                pick(getState(store) as State),
                            );
                            if (serialized === last) {
                                return;
                            }

                            last = serialized;
                            void write();
                        }, debounceMs);
                    },
                    { injector },
                );

                // 古い丸ごと保存が残っていたら、fields だけに書き直す
                if (hasOtherKeys) {
                    await write();
                }
            };

            return {
                onInit(): void {
                    if (isServer) {
                        return;
                    }

                    void load();
                },
            };
        }),
    );
}

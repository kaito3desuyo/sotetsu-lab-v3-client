import { isPlatformServer } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import localForage from 'localforage';

/**
 * 端末の保存領域（localforage）の窓口。
 * サーバーでは何も読み書きせず、保存に失敗しても画面は動かすので握りつぶす。
 */
@Injectable({ providedIn: 'root' })
export class DeviceStorage {
    readonly #isServer = isPlatformServer(inject(PLATFORM_ID));

    async getItem<T>(key: string): Promise<T | null> {
        if (this.#isServer) {
            return null;
        }

        try {
            return await localForage.getItem<T>(key);
        } catch {
            return null;
        }
    }

    async setItem<T>(params: { key: string; value: T }): Promise<void> {
        if (this.#isServer) {
            return;
        }

        try {
            await localForage.setItem(params.key, params.value);
        } catch {
            // 保存できなくても画面は動くので握りつぶす
        }
    }

    async removeItem(key: string): Promise<void> {
        if (this.#isServer) {
            return;
        }

        try {
            await localForage.removeItem(key);
        } catch {
            // 消せなくても画面は動くので握りつぶす
        }
    }
}

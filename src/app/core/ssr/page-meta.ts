import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';

const SITE_NAME = 'Sotetsu Lab. v3';

/** index.html の description と同じ。ページが説明を持たないときに使う */
export const DEFAULT_DESCRIPTION =
    '相模鉄道こと相鉄線に関する情報を提供する、相鉄ファンサイトです。運用目撃情報・運用表・時刻表等を公開しています。';

/** SNS のプレビューに出すサイト共通の 1 枚（spec 5.1。ページごとの画像は作らない） */
const OG_IMAGE_PATH = '/assets/icons/android-chrome-512x512.png';

/**
 * ページの題名・説明・OGP を入れる係（spec 5.1）。サーバーで描いた HTML に入り、検索と SNS のプレビューに使われる。
 * ページを開いたときに pageResolver が set を呼び、取ったデータで詳しくするページが setTitle を呼ぶ。
 */
@Injectable({ providedIn: 'root' })
export class PageMeta {
    readonly #title = inject(Title);
    readonly #meta = inject(Meta);

    set(params: { title?: string; description?: string; url?: string }): void {
        this.setTitle(params.title ?? '');
        const description = params.description ?? DEFAULT_DESCRIPTION;
        this.#meta.updateTag({ name: 'description', content: description });
        this.#meta.updateTag({
            property: 'og:description',
            content: description,
        });
        this.#meta.updateTag({ property: 'og:type', content: 'website' });
        this.#meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
        this.#meta.updateTag({ property: 'og:locale', content: 'ja_JP' });
        this.#meta.updateTag({
            property: 'og:image',
            content: environment.siteUrl + OG_IMAGE_PATH,
        });
        this.#meta.updateTag({ name: 'twitter:card', content: 'summary' });
        if (params.url === undefined) {
            this.#meta.removeTag('property="og:url"');
        } else {
            this.#meta.updateTag({
                property: 'og:url',
                content: environment.siteUrl + params.url,
            });
        }
    }

    /** 取ったデータで題名を詳しくするとき。題名と og:title だけ替える */
    setTitle(title: string): void {
        const full = title ? `${title} - ${SITE_NAME}` : SITE_NAME;
        this.#title.setTitle(full);
        this.#meta.updateTag({ property: 'og:title', content: full });
    }
}

import { ErrorHandler, inject, Injectable } from '@angular/core';
import { SsrResponse } from 'src/app/core/ssr/ssr-response';

/**
 * サーバーで描くときのエラーの係。本番の設定では NGXLogger が出力を止めているので、
 * そのままだとサーバーのエラーがどこにも残らない。標準エラーに出し、Lambda のログと手元の確かめ（ssr:check）で拾えるようにする。
 * エラーが起きたまま描いたページは CDN に置かない。
 */
@Injectable()
export class ServerErrorHandler implements ErrorHandler {
    readonly #ssrResponse = inject(SsrResponse);

    handleError(error: unknown): void {
        console.error('ERROR', error);
        this.#ssrResponse.setCachePolicy('no-store');
    }
}

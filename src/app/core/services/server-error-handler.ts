import { ErrorHandler, Injectable } from '@angular/core';

/**
 * サーバーで描くときのエラーの係。本番の設定では NGXLogger が出力を止めているので、
 * そのままだとサーバーのエラーがどこにも残らない。標準エラーに出し、Lambda のログと手元の確かめ（ssr:check）で拾えるようにする。
 */
@Injectable()
export class ServerErrorHandler implements ErrorHandler {
    handleError(error: unknown): void {
        console.error('ERROR', error);
    }
}

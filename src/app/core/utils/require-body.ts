import { HttpResponse } from '@angular/common/http';

/** 本文が空（null）のレスポンスは、これまで `res.body.xxx` が TypeError で落ちていた。同じく例外にする */
export function requireBody<T>(res: HttpResponse<T>): T {
    if (res.body === null) {
        throw new TypeError('The response body is null.');
    }
    return res.body;
}

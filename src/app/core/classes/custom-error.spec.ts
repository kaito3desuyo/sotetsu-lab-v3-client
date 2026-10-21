import { HttpErrorResponse } from '@angular/common/http';
import { FetchError } from './custom-error';

describe('FetchError.fromHttpErrorResponse', () => {
    it('ステータス・本文の message・url・本文を持つ Error になる', () => {
        const body = { message: '編成が見つかりません', statusCode: 400 };
        const error = FetchError.fromHttpErrorResponse(
            new HttpErrorResponse({
                status: 400,
                url: 'https://api.example.com/v3/operation-sightings',
                error: body,
            }),
        );

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(FetchError);
        expect(error.name).toBe('FetchError');
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('編成が見つかりません');
        expect(error.url).toBe(
            'https://api.example.com/v3/operation-sightings',
        );
        expect(error.body).toBe(body);
    });

    it('入力検証の message が配列なら「、」で結ぶ', () => {
        const error = FetchError.fromHttpErrorResponse(
            new HttpErrorResponse({
                status: 400,
                error: { message: ['時刻が無い', '運番が無い'] },
            }),
        );

        expect(error.message).toBe('時刻が無い、運番が無い');
    });

    it('本文に message が無ければ「不明なエラーが発生しました」', () => {
        const error = FetchError.fromHttpErrorResponse(
            new HttpErrorResponse({ status: 502, error: 'Bad Gateway' }),
        );

        expect(error.message).toBe('不明なエラーが発生しました');
        expect(error.body).toBe('Bad Gateway');
    });

    it('通信が切れた（status 0）ときも「不明なエラーが発生しました」', () => {
        const error = FetchError.fromHttpErrorResponse(
            new HttpErrorResponse({
                status: 0,
                error: new ProgressEvent('error'),
            }),
        );

        expect(error.statusCode).toBe(0);
        expect(error.message).toBe('不明なエラーが発生しました');
        expect(error.url).toBeNull();
    });
});

describe('FetchError', () => {
    it('今までどおり ステータスとメッセージだけでも作れる', () => {
        const error = new FetchError(400, '編成が見つかりません');

        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('編成が見つかりません');
        expect(error.url).toBeNull();
        expect(error.body).toBeNull();
    });
});

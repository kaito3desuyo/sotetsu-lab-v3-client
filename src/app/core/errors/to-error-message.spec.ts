import { FetchError } from '../classes/custom-error';
import { toErrorMessage } from './to-error-message';

describe('toErrorMessage', () => {
    it('FetchError はステータスと道筋（クエリは落とす）を付ける', () => {
        const error = new FetchError(
            500,
            '止まっています',
            {},
            'https://api.example.com/v3/trip-blocks?calendar_id=1&fields=a',
        );

        expect(toErrorMessage(error)).toBe(
            'FetchError 500 /v3/trip-blocks: 止まっています',
        );
    });

    it('url の無い FetchError は道筋を省く', () => {
        expect(toErrorMessage(new FetchError(400, '編成が見つかりません'))).toBe(
            'FetchError 400: 編成が見つかりません',
        );
    });

    it('ほかの Error は「名前: メッセージ」', () => {
        expect(toErrorMessage(new TypeError('壊れた'))).toBe(
            'TypeError: 壊れた',
        );
    });

    it('Error でないものは文字列にする', () => {
        expect(toErrorMessage('文字列')).toBe('文字列');
    });

    it('100 文字までに切る', () => {
        expect(toErrorMessage(new Error('あ'.repeat(150)))).toBe(
            `Error: ${'あ'.repeat(150)}`.slice(0, 100),
        );
    });
});

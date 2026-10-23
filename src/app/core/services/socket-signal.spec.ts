import { readSocketSignal } from './socket-signal';

const message = (data: unknown) => ({ data }) as MessageEvent;

describe('readSocketSignal', () => {
    it('sighting と timetable を読む', () => {
        expect(readSocketSignal(message('{"type":"sighting"}'))).toBe(
            'sighting',
        );
        expect(readSocketSignal(message('{"type":"timetable"}'))).toBe(
            'timetable',
        );
    });

    it.each([
        ['{"type":"other"}'],
        ['{"action":"sendSighting","data":"{}"}'],
        ['"{\\"action\\":\\"sendSighting\\"}"'],
        ['not json'],
        [''],
        [null],
    ])('%s は null（無視する）', (data) => {
        expect(readSocketSignal(message(data))).toBeNull();
    });

    it('MessageEvent でないものは null', () => {
        expect(readSocketSignal(undefined)).toBeNull();
        expect(readSocketSignal('sighting')).toBeNull();
    });
});

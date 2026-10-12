import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { parseTripDirectionParam } from './trip-direction-param.util';

describe('parseTripDirectionParam', () => {
    it('"0" と "1" だけを向きとして読む', () => {
        expect(parseTripDirectionParam('0')).toBe(ETripDirection.INBOUND);
        expect(parseTripDirectionParam('1')).toBe(ETripDirection.OUTBOUND);
    });

    it.each([null, '', 'abc', '2', '-1', '0.5', ' 1'])(
        '%p は向きにならない（null）',
        (raw) => {
            expect(parseTripDirectionParam(raw)).toBeNull();
        },
    );
});

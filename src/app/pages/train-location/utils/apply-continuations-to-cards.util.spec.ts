import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TrainPosition } from 'src/app/shared/train-position.util';
import { TrainLocationCard } from '../interfaces/train-location-card.interface';
import { applyContinuationsToCards } from './apply-continuations-to-cards.util';

function card(overrides: Partial<TrainLocationCard>): TrainLocationCard {
    return {
        tripId: 't1',
        tripNumber: '7416',
        tripClassName: '各停',
        tripClassColor: '#ff4081',
        operationNumber: '94G',
        destinationName: '和光市',
        direction: 'inbound',
        formationNumber: '20105',
        detailLink: ['/timetable', 'all-line', {}],
        ...overrides,
    };
}

/** 次の列車（C 駅から発つ） */
const NEXT = {
    tripId: 't2',
    times: [
        {
            stationId: 'C',
            stopSequence: 1,
            departureTime: '10:06:00',
        } as TimeDetailsDto,
    ],
} as TripDetailsDto;
const STOPPED_AT_C: TrainPosition[] = [
    { type: 'stopped', tripId: 't1', stationId: 'C' },
];

describe('applyContinuationsToCards', () => {
    it('種別が変わる駅に着いて停車中の列車のカードは、変更後の種別・色・列番にする', () => {
        const cards = new Map([
            ['t1', card({})],
            [
                't2',
                card({
                    tripId: 't2',
                    tripNumber: '994122',
                    tripClassName: '急行',
                    tripClassColor: '#c00',
                }),
            ],
        ]);
        const continuations = new Map([['t1', NEXT]]);

        const result = applyContinuationsToCards(
            cards,
            continuations,
            STOPPED_AT_C,
        );

        expect(result.get('t1')).toEqual(
            card({
                tripNumber: '994122',
                tripClassName: '急行',
                tripClassColor: '#c00',
            }),
        );
        expect(result.get('t2')).toBe(cards.get('t2'));
    });

    it('引き継ぎの無い列車・次の列車のカードが無い列車はそのまま', () => {
        const cards = new Map([['t1', card({})]]);
        const continuations = new Map([
            ['t1', { tripId: 'missing' } as TripDetailsDto],
        ]);

        const result = applyContinuationsToCards(
            cards,
            continuations,
            STOPPED_AT_C,
        );

        expect(result.get('t1')).toBe(cards.get('t1'));
    });

    it('元のカードの辞書は書き換えない（駅の欄は変更前の種別・列番を使う）', () => {
        const original = card({});
        const cards = new Map([
            ['t1', original],
            [
                't2',
                card({
                    tripId: 't2',
                    tripNumber: '994122',
                    tripClassName: '急行',
                }),
            ],
        ]);

        applyContinuationsToCards(cards, new Map([['t1', NEXT]]), STOPPED_AT_C);

        expect(cards.get('t1')).toBe(original);
        expect(original.tripNumber).toBe('7416');
    });

    it('種別が変わる駅に着く前（走行中・手前の駅に停車中）は変更前のまま', () => {
        const cards = new Map([
            ['t1', card({})],
            [
                't2',
                card({
                    tripId: 't2',
                    tripNumber: '994122',
                    tripClassName: '急行',
                }),
            ],
        ]);
        const continuations = new Map([['t1', NEXT]]);

        const running = applyContinuationsToCards(cards, continuations, [
            {
                type: 'between',
                tripId: 't1',
                fromStationId: 'B',
                toStationId: 'C',
                progress: 0.5,
            },
        ]);
        const stoppedEarlier = applyContinuationsToCards(cards, continuations, [
            { type: 'stopped', tripId: 't1', stationId: 'B' },
        ]);

        expect(running.get('t1')?.tripNumber).toBe('7416');
        expect(stoppedEarlier.get('t1')?.tripNumber).toBe('7416');
    });
});

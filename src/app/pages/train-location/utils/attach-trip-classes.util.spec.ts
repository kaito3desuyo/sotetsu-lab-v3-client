import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import { attachTripClasses } from './attach-trip-classes.util';

const CLASSES = [
    {
        tripClassId: 'tc-local',
        tripClassName: '各停（SO）',
        tripClassColor: '#212121',
    },
    {
        tripClassId: 'tc-rapid',
        tripClassName: '快速（SO）',
        tripClassColor: '#3f51b5',
    },
] as TripClassDetailsDto[];

describe('attachTripClasses', () => {
    it('trip の tripClassId から種別（名前・色）を補う', () => {
        const blocks = {
            0: [
                {
                    tripBlockId: 'b1',
                    trips: [{ tripId: 't1', tripClassId: 'tc-rapid' }],
                },
            ],
            1: [
                {
                    tripBlockId: 'b2',
                    trips: [{ tripId: 't2', tripClassId: 'tc-local' }],
                },
            ],
        } as unknown as Record<number, TripBlockDetailsDto[]>;

        const result = attachTripClasses(blocks, CLASSES);

        expect(result[0][0].trips?.[0].tripClass).toBe(CLASSES[1]);
        expect(result[1][0].trips?.[0].tripClass).toBe(CLASSES[0]);
    });

    it('一覧に無い種別・すでに種別を持つ trip はそのまま。元のデータは書き換えない', () => {
        const own = {
            tripClassId: 'tc-own',
            tripClassName: '特急',
        } as TripClassDetailsDto;
        const blocks = {
            0: [
                {
                    tripBlockId: 'b1',
                    trips: [
                        { tripId: 't1', tripClassId: 'tc-unknown' },
                        {
                            tripId: 't2',
                            tripClassId: 'tc-local',
                            tripClass: own,
                        },
                    ],
                },
            ],
        } as unknown as Record<number, TripBlockDetailsDto[]>;

        const result = attachTripClasses(blocks, CLASSES);

        expect(result[0][0].trips?.[0].tripClass).toBeUndefined();
        expect(result[0][0].trips?.[1].tripClass).toBe(own);
        expect(blocks[0][0].trips?.[0]).not.toHaveProperty('tripClass');
    });
});

import { TripClassDtoBuilder } from './trip-class.dto.builder';

describe('TripClassDtoBuilder', () => {
    it('id を tripClassId にし、入れ子の列車の id も付け替える', () => {
        const dto = TripClassDtoBuilder.buildFromModel({
            id: 'tc-1',
            tripClassName: '各停',
            trips: [{ id: 't-1' } as never],
        });

        expect(dto.tripClassId).toBe('tc-1');
        expect(dto.tripClassName).toBe('各停');
        expect(dto).not.toHaveProperty('id');
        expect(dto.trips[0].tripId).toBe('t-1');
    });
});

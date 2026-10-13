import { UserDtoBuilder } from './user.dto.builder';

describe('UserDtoBuilder', () => {
    it('DTO の項目だけを写し、password は持たせない', () => {
        const dto = UserDtoBuilder.buildFromModel({
            userId: 'u-1',
            username: 'a',
            password: 'secret',
            displayName: 'A',
            role: 'admin',
            createdAt: 'c',
            updatedAt: 'u',
        });

        expect(dto).toEqual({
            userId: 'u-1',
            username: 'a',
            displayName: 'A',
            role: 'admin',
            createdAt: 'c',
            updatedAt: 'u',
        });
        expect(dto).not.toHaveProperty('password');
    });
});

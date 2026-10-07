import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { TripBlockCommand } from '../infrastructure/commands/trip-block.command';
import { TripBlockQuery } from '../infrastructure/queries/trip-block.query';
import { TripBlockService } from './trip-block.service';

describe('TripBlockService の書き込み', () => {
    const setup = (result: 'ok' | 'ng') => {
        const reply = () =>
            result === 'ok' ? of({}) : throwError(() => new Error('ng'));
        const command = {
            createMany: jest.fn(() => (result === 'ok' ? of([]) : reply())),
            replaceOne: jest.fn(reply),
            addTripToTripBlock: jest.fn(reply),
            deleteTripFromTripBlock: jest.fn(reply),
        };
        const invalidator = { invalidate: jest.fn() };
        TestBed.configureTestingModule({
            providers: [
                { provide: TripBlockCommand, useValue: command },
                { provide: TripBlockQuery, useValue: {} },
                { provide: QueryInvalidator, useValue: invalidator },
            ],
        });
        return { service: TestBed.inject(TripBlockService), invalidator };
    };

    afterEach(() => TestBed.resetTestingModule());

    const writes: [string, (s: TripBlockService) => Observable<unknown>][] = [
        ['createMany', (s) => s.createMany([])],
        ['replaceOne', (s) => s.replaceOne('b1', {} as never)],
        ['addTripToTripBlock', (s) => s.addTripToTripBlock('b1', {} as never)],
        [
            'deleteTripFromTripBlock',
            (s) => s.deleteTripFromTripBlock('b1', {} as never),
        ],
    ];

    it.each(writes)(
        "%s が成功したら 'timetable' を 1 回知らせる",
        (_name, call) => {
            const { service, invalidator } = setup('ok');

            call(service).subscribe();

            expect(invalidator.invalidate).toHaveBeenCalledTimes(1);
            expect(invalidator.invalidate).toHaveBeenCalledWith('timetable');
        },
    );

    it.each(writes)('%s が失敗したら知らせない', (_name, call) => {
        const { service, invalidator } = setup('ng');

        call(service).subscribe({ error: () => undefined });

        expect(invalidator.invalidate).not.toHaveBeenCalled();
    });
});

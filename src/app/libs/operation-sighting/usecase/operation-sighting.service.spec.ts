import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { OperationSightingCommand } from '../infrastructure/commands/operation-sighting.command';
import { OperationSightingQuery } from '../infrastructure/queries/operation-sighting.query';
import { OperationSightingService } from './operation-sighting.service';

describe('OperationSightingService の書き込み', () => {
    const setup = (result: 'ok' | 'ng') => {
        const reply = () =>
            result === 'ok' ? of(undefined) : throwError(() => new Error('ng'));
        const command = {
            post: jest.fn(reply),
            invalidate: jest.fn(reply),
            restore: jest.fn(reply),
        };
        const invalidator = { invalidate: jest.fn() };
        TestBed.configureTestingModule({
            providers: [
                { provide: OperationSightingCommand, useValue: command },
                { provide: OperationSightingQuery, useValue: {} },
                { provide: QueryInvalidator, useValue: invalidator },
            ],
        });
        return {
            service: TestBed.inject(OperationSightingService),
            invalidator,
        };
    };

    afterEach(() => TestBed.resetTestingModule());

    const writes: [
        string,
        (s: OperationSightingService) => Observable<void>,
    ][] = [
        ['post', (s) => s.post({} as never)],
        ['invalidate', (s) => s.invalidate({} as never)],
        ['restore', (s) => s.restore({} as never)],
    ];

    it.each(writes)(
        "%s が成功したら 'sighting' を 1 回知らせる",
        (_name, call) => {
            const { service, invalidator } = setup('ok');

            call(service).subscribe();

            expect(invalidator.invalidate).toHaveBeenCalledTimes(1);
            expect(invalidator.invalidate).toHaveBeenCalledWith('sighting');
        },
    );

    it.each(writes)('%s が失敗したら知らせない', (_name, call) => {
        const { service, invalidator } = setup('ng');

        call(service).subscribe({ error: () => undefined });

        expect(invalidator.invalidate).not.toHaveBeenCalled();
    });
});

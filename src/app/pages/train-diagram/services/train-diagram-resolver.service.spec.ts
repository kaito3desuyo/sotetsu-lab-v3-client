import { ActivatedRouteSnapshot } from '@angular/router';
import { TestBed, inject } from '@angular/core/testing';
import { ReplaySubject, of } from 'rxjs';
import { TitleService } from 'src/app/core/services/title.service';
import { InitializeStateQuery } from 'src/app/global-states/initialize.state';
import { TrainDiagramResolverService } from './train-diagram-resolver.service';
import { TrainDiagramStore } from '../stores/train-diagram.store';

describe('Service: TrainDiagramResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                TrainDiagramResolverService,
                { provide: TitleService, useValue: { setTitle: () => {} } },
                {
                    provide: InitializeStateQuery,
                    useValue: { isInitialized$: of(true) },
                },
            ],
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should ...', inject(
        [TrainDiagramResolverService],
        (service: TrainDiagramResolverService) => {
            expect(service).toBeTruthy();
        },
    ));

    it('ストアの保存した値を読み終えてから解決する', (done) => {
        const resolver = TestBed.inject(TrainDiagramResolverService);
        const subject = new ReplaySubject<boolean>(1);
        // persistInitialized$ は運用表のストアと同じプロパティ（getter ではない）なので
        // spyOn(..., 'get') は使えない。jest.replaceProperty で直接差し替える。
        jest.replaceProperty(TrainDiagramStore, 'persistInitialized$', subject);
        let resolved = false;
        resolver
            .resolve({
                data: { title: '列車ダイヤグラム' },
            } as unknown as ActivatedRouteSnapshot)
            .subscribe(() => (resolved = true));
        expect(resolved).toBe(false);
        subject.next(true);
        subject.complete();
        expect(resolved).toBe(true);
        done();
    });
});

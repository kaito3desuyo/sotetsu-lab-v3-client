import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { GoogleAnalyticsService } from 'src/app/core/services/google-analytics.service';
import { SocketService } from 'src/app/core/services/socket.service';
import { LoadingService } from '../loading/loading.service';
import { OperationPostCardComponent } from './operation-post-card.component';
import { OperationPostCardService } from './operation-post-card.service';
import { OperationPostFormComponent } from './operation-post-form.component';

describe('OperationPostCardComponent', () => {
    let fixture: ComponentFixture<OperationPostCardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationPostCardComponent],
            providers: [
                {
                    provide: OperationPostCardService,
                    useValue: {
                        fetchServiceAgencies: () => of(undefined),
                    },
                },
                {
                    provide: LoadingService,
                    useValue: { open: jest.fn(), close: jest.fn() },
                },
                {
                    provide: ErrorHandlerService,
                    useValue: { handleError: jest.fn() },
                },
                { provide: SocketService, useValue: { emit: jest.fn() } },
                {
                    provide: GoogleAnalyticsService,
                    useValue: { sendEvent: jest.fn() },
                },
            ],
        })
            .overrideComponent(OperationPostFormComponent, {
                set: { template: '', imports: [] },
            })
            .overrideProvider(MatSnackBar, { useValue: { open: jest.fn() } })
            .compileComponents();

        fixture = TestBed.createComponent(OperationPostCardComponent);
        fixture.detectChanges();
    });

    it('フォームを包んで見出し「運用情報を投稿する」を出す', () => {
        const element: HTMLElement = fixture.nativeElement;
        expect(element.querySelector('app-operation-post-form')).not.toBeNull();
        expect(element.querySelector('h2')?.textContent).toContain(
            '運用情報を投稿する',
        );
    });
});

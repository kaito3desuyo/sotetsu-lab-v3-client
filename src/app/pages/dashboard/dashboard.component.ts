import { Component, Injector, Inject } from '@angular/core';
import { TitleService } from 'src/app/general/services/title.service';
import { BaseComponent } from 'src/app/general/classes/base-component';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent extends BaseComponent {
  constructor(
    @Inject(Injector) injector: Injector,
    private route: ActivatedRoute,
    private titleService: TitleService
  ) {
    super(injector);
    this.subscription = this.route.data.subscribe((data: { title: string }) => {
      this.titleService.setTitle('');
    });
  }
}

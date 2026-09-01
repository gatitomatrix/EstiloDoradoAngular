import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AuthService } from './services/auth/auth.service';
import { ChatWidgetComponent } from './widgets/web/asistente/chat-widget.component';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastModule, ConfirmDialogModule, ChatWidgetComponent],
  template: `
    <router-outlet></router-outlet>
    <ed-chat-widget />
    <p-toast position="top-right">
      <ng-template let-message pTemplate="message">
        <button type="button" class="ed-toast-hit"
          [class.ed-toast-hit--link]="message.data?.link"
          (click)="onToastClick(message)">
          <strong>{{ message.summary }}</strong>
          <span>{{ message.detail }}</span>
          @if (message.data?.cta) {
            <em>{{ message.data.cta }}</em>
          }
        </button>
      </ng-template>
    </p-toast>
    <p-confirmDialog />
  `,
  styles: [`
    .ed-toast-hit {
      display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
      width: 100%; border: 0; background: transparent; color: inherit;
      text-align: left; font: inherit; padding: 0; cursor: default;
    }
    .ed-toast-hit--link { cursor: pointer; }
    .ed-toast-hit strong { font-size: 14px; }
    .ed-toast-hit span { font-size: 13px; opacity: .92; }
    .ed-toast-hit em { font-size: 12px; font-style: normal; font-weight: 700; color: #1B5E38; }
  `],
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'estilo-dorado';
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    this.auth.checkAuth();
  }

  onToastClick(message: { data?: { link?: string } }) {
    const link = message?.data?.link;
    if (link) this.router.navigateByUrl(link);
  }
}
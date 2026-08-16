import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
    <p-toast position="top-right"></p-toast>
    <p-confirmDialog />
  `,
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'estilo-dorado';
  private auth = inject(AuthService);

  ngOnInit() {
    this.auth.checkAuth();
  }
}

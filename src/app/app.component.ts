import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AuthService } from './services/auth/auth.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastModule, ConfirmDialogModule],
  template: `
    <router-outlet></router-outlet>
    <p-toast position="top-right"></p-toast>
    <p-confirmDialog />
  `,
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'estilo-dorado';
  private auth = inject(AuthService);

  ngOnInit() {
    // ✅ Verifica automáticamente si el cliente sigue autenticado
    // Esto no afecta al panel admin, solo al módulo cliente
    this.auth.checkAuth();
  }
}

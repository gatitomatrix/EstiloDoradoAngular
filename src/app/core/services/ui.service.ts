// src/app/core/services/ui.service.ts
import { Injectable, inject } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class UiService {
  private toast = inject(MessageService, { optional: true });
  private confirmSvc = inject(ConfirmationService, { optional: true });

  ok(msg: string, summary = 'OK', opts?: { link?: string; cta?: string }) {
    this.toast?.add({
      severity: 'success',
      summary,
      detail: msg,
      data: opts?.link ? { link: opts.link, cta: opts.cta || 'Ver carrito' } : undefined,
      life: opts?.link ? 6000 : 3000,
    });
  }
  err(msg:string, summary='Error'){
    if (this.toast) this.toast.add({severity:'error', summary, detail: msg});
    else alert(`${summary}: ${msg}`);
  }
  warn(msg:string, summary='Atención'){ this.toast?.add({severity:'warn', summary, detail: msg}); }

  confirmDanger(message:string, accept: () => void, header='Confirmación'){
    this.confirmSvc?.confirm({
      message,
      header,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-outlined',
      accept,
    });
  }
}

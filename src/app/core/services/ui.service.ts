// src/app/core/services/ui.service.ts
import { Injectable, inject } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class UiService {
  private toast = inject(MessageService, { optional: true });
  private confirmSvc = inject(ConfirmationService, { optional: true });

  ok(msg:string, summary='OK'){ this.toast?.add({severity:'success', summary, detail: msg}); }
  err(msg:string, summary='Error'){
    if (this.toast) this.toast.add({severity:'error', summary, detail: msg});
    else alert(`${summary}: ${msg}`);
  }
  warn(msg:string, summary='Atención'){ this.toast?.add({severity:'warn', summary, detail: msg}); }

  confirmDanger(message:string, accept: () => void, header='Confirmación'){
    this.confirmSvc?.confirm({ message, header, icon:'pi pi-exclamation-triangle', accept });
  }
}

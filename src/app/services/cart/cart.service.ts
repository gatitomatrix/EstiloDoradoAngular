import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { CartItem } from '../../models/cart/cart-item';
import { AuthService } from '../auth/auth.service';

/**
 * - Invitado: sessionStorage ('ed_cart_guest')
 * - Usuario: localStorage ('ed_cart_user_<id>')
 * - En login: fusiona carrito invitado + carrito del usuario (no descarta)
 * - En logout: guarda usuario y deja carrito invitado vacío
 */

type Mode = 'guest' | 'user';

const GUEST_KEY = 'ed_cart_guest';
const USER_KEY_PREFIX = 'ed_cart_user_';

@Injectable({ providedIn: 'root' })
export class CartService {
  private auth = inject(AuthService);

  private _items$ = new BehaviorSubject<CartItem[]>([]);
  public items$ = this._items$.asObservable();

  private mode: Mode = 'guest';
  private currentUserId: number | null = null;
  private sub?: Subscription;

  constructor() {
    const u = this.auth.user;
    if (u) {
      this.mode = 'user';
      this.currentUserId = u.id_cliente;
      this._items$.next(this.readUser(u.id_cliente));
    } else {
      this.mode = 'guest';
      this.currentUserId = null;
      this._items$.next(this.readGuest());
    }

    this.sub = this.auth.user$.subscribe((user) => {
      const prevUserId = this.currentUserId;

      if (!prevUserId && user) {
        // LOGIN: fusionar guest → user
        const guest = this.readGuest();
        const userCart = this.readUser(user.id_cliente);
        const merged = this.mergeCarts(userCart, guest);
        this.mode = 'user';
        this.currentUserId = user.id_cliente;
        this.writeGuest([]);
        this.writeUser(user.id_cliente, merged);
        this._items$.next(merged);
        return;
      }

      if (prevUserId && !user) {
        // LOGOUT
        this.writeUser(prevUserId, this._items$.value);
        this.mode = 'guest';
        this.currentUserId = null;
        this.writeGuest([]);
        this._items$.next([]);
        return;
      }

      if (prevUserId && user && user.id_cliente !== prevUserId) {
        this.writeUser(prevUserId, this._items$.value);
        this.mode = 'user';
        this.currentUserId = user.id_cliente;
        this._items$.next(this.readUser(user.id_cliente));
      }
    });
  }

  get items(): CartItem[] {
    return this._items$.value;
  }

  getItems() {
    return this.items;
  }

  add(item: CartItem) {
    const list = [...this._items$.getValue()];
    const idx = list.findIndex((x) => x.id === item.id);

    if (idx >= 0) {
      const current = list[idx];
      const nuevaQty = Math.min(current.qty + item.qty, current.stockMax);
      list[idx] = { ...current, qty: nuevaQty };
    } else {
      list.push({ ...item, qty: Math.min(item.qty, item.stockMax) });
    }

    this.updateAndPersist(list);
  }

  updateQty(id: CartItem['id'], qty: number) {
    const safeQty = Math.max(1, qty);
    const list = this.items.map((x) =>
      x.id === id ? { ...x, qty: Math.min(safeQty, x.stockMax) } : x,
    );
    this.updateAndPersist(list);
  }

  remove(id: CartItem['id']) {
    this.updateAndPersist(this.items.filter((x) => x.id !== id));
  }

  clear() {
    this.updateAndPersist([]);
  }

  getSubtotal(): number {
    return this.items.reduce((acc, x) => acc + x.precio * x.qty, 0);
  }

  getListado(): number {
    return this.items.reduce((acc, x) => acc + (x.precioLista ?? x.precio) * x.qty, 0);
  }

  getDescuentos(): number {
    return Math.max(0, this.getListado() - this.getSubtotal());
  }

  /** Une dos carritos sumando qty y respetando stockMax. */
  private mergeCarts(base: CartItem[], extra: CartItem[]): CartItem[] {
    const map = new Map<string | number, CartItem>();
    for (const it of base) {
      map.set(it.id, { ...it });
    }
    for (const it of extra) {
      const cur = map.get(it.id);
      if (!cur) {
        map.set(it.id, {
          ...it,
          qty: Math.min(it.qty, it.stockMax || it.qty),
        });
      } else {
        const max = Math.max(cur.stockMax || 1, it.stockMax || 1);
        const qty = Math.min((cur.qty || 0) + (it.qty || 0), max);
        map.set(it.id, {
          ...cur,
          ...it,
          stockMax: max,
          qty,
          precio: it.precio || cur.precio,
          nombre: it.nombre || cur.nombre,
          imagen: it.imagen || cur.imagen,
        });
      }
    }
    return Array.from(map.values());
  }

  private updateAndPersist(list: CartItem[]) {
    this._items$.next(list);
    try {
      if (this.mode === 'guest') {
        this.writeGuest(list);
      } else if (this.mode === 'user' && this.currentUserId != null) {
        this.writeUser(this.currentUserId, list);
      }
    } catch (e) {
      console.warn('Cart storage error:', e);
    }
  }

  private readGuest(): CartItem[] {
    try {
      const raw = sessionStorage.getItem(GUEST_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private writeGuest(items: CartItem[]) {
    try {
      sessionStorage.setItem(GUEST_KEY, JSON.stringify(items));
    } catch {
      /* noop */
    }
  }

  private keyForUser(userId: number) {
    return `${USER_KEY_PREFIX}${userId}`;
  }

  private readUser(userId: number): CartItem[] {
    try {
      const raw = localStorage.getItem(this.keyForUser(userId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private writeUser(userId: number, items: CartItem[]) {
    try {
      localStorage.setItem(this.keyForUser(userId), JSON.stringify(items));
    } catch {
      /* noop */
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}

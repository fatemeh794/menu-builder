import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Category,
  CreateOrderPayload,
  MenuItem,
  Order,
  Restaurant,
  TablePublic,
} from '../../core/models';

@Injectable({ providedIn: 'root' })
export class MenuApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getRestaurant(slug: string): Observable<Restaurant> {
    return this.http.get<Restaurant>(`${this.base}/menu/${slug}/`);
  }

  getCategories(slug: string): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.base}/menu/${slug}/categories/`);
  }

  getItems(slug: string): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(`${this.base}/menu/${slug}/items/`);
  }

  validateTable(slug: string, token: string): Observable<TablePublic> {
    return this.http.get<TablePublic>(`${this.base}/tables/${slug}/${token}/`);
  }

  createOrder(payload: CreateOrderPayload): Observable<Order> {
    return this.http.post<Order>(`${this.base}/orders/`, payload);
  }

  trackOrder(token: string): Observable<Order> {
    return this.http.get<Order>(`${this.base}/orders/track/${token}/`);
  }

  createPayment(orderToken: string): Observable<{ redirect_url: string }> {
    return this.http.post<{ redirect_url: string }>(
      `${this.base}/payments/${orderToken}/create/`,
      {},
    );
  }
}

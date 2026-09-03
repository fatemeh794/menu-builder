import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Category,
  MenuItem,
  MenuItemOption,
  MenuItemOptionGroup,
  MyMembership,
  OrderListItem,
  OrderStatus,
  Order,
  RestaurantMembership,
  RestaurantSettings,
  RestaurantTable,
} from '../../core/models';

/** A group written to the API: options may be brand new (no `id` yet -
 * the backend assigns one) or existing (carry their `id` so the backend
 * updates in place instead of creating a duplicate). */
type OptionGroupWritePayload = Partial<Omit<MenuItemOptionGroup, 'options'>> & {
  options?: Partial<MenuItemOption>[];
};

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  // --- Restaurants / settings ---
  getMyRestaurants(): Observable<Paginated<MyMembership>> {
    return this.http.get<Paginated<MyMembership>>(`${this.base}/dashboard/restaurants/`);
  }

  getSettings(slug: string): Observable<RestaurantSettings> {
    return this.http.get<RestaurantSettings>(`${this.base}/dashboard/${slug}/settings/`);
  }

  updateSettings(slug: string, data: FormData): Observable<RestaurantSettings> {
    return this.http.patch<RestaurantSettings>(`${this.base}/dashboard/${slug}/settings/`, data);
  }

  // --- Categories ---
  getCategories(slug: string): Observable<Paginated<Category>> {
    return this.http.get<Paginated<Category>>(`${this.base}/dashboard/${slug}/categories/`);
  }

  createCategory(slug: string, data: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(`${this.base}/dashboard/${slug}/categories/`, data);
  }

  updateCategory(slug: string, id: string, data: Partial<Category>): Observable<Category> {
    return this.http.patch<Category>(`${this.base}/dashboard/${slug}/categories/${id}/`, data);
  }

  deleteCategory(slug: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/dashboard/${slug}/categories/${id}/`);
  }

  // --- Menu items ---
  getItems(slug: string): Observable<Paginated<MenuItem>> {
    return this.http.get<Paginated<MenuItem>>(`${this.base}/dashboard/${slug}/items/`);
  }

  createItem(slug: string, data: Partial<MenuItem>): Observable<MenuItem> {
    return this.http.post<MenuItem>(`${this.base}/dashboard/${slug}/items/`, data);
  }

  updateItem(slug: string, id: string, data: Partial<MenuItem>): Observable<MenuItem> {
    return this.http.patch<MenuItem>(`${this.base}/dashboard/${slug}/items/${id}/`, data);
  }

  deleteItem(slug: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/dashboard/${slug}/items/${id}/`);
  }

  // --- Option groups (nested under an item) ---
  getOptionGroups(slug: string, itemId: string): Observable<Paginated<MenuItemOptionGroup>> {
    return this.http.get<Paginated<MenuItemOptionGroup>>(
      `${this.base}/dashboard/${slug}/items/${itemId}/option-groups/`,
    );
  }

  createOptionGroup(
    slug: string,
    itemId: string,
    data: OptionGroupWritePayload,
  ): Observable<MenuItemOptionGroup> {
    return this.http.post<MenuItemOptionGroup>(
      `${this.base}/dashboard/${slug}/items/${itemId}/option-groups/`,
      data,
    );
  }

  updateOptionGroup(
    slug: string,
    itemId: string,
    groupId: string,
    data: OptionGroupWritePayload,
  ): Observable<MenuItemOptionGroup> {
    return this.http.patch<MenuItemOptionGroup>(
      `${this.base}/dashboard/${slug}/items/${itemId}/option-groups/${groupId}/`,
      data,
    );
  }

  deleteOptionGroup(slug: string, itemId: string, groupId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/dashboard/${slug}/items/${itemId}/option-groups/${groupId}/`,
    );
  }

  // --- Tables ---
  getTables(slug: string): Observable<Paginated<RestaurantTable>> {
    return this.http.get<Paginated<RestaurantTable>>(`${this.base}/dashboard/${slug}/tables/`);
  }

  createTable(slug: string, label: string): Observable<RestaurantTable> {
    return this.http.post<RestaurantTable>(`${this.base}/dashboard/${slug}/tables/`, { label });
  }

  updateTable(
    slug: string,
    id: string,
    data: Partial<RestaurantTable>,
  ): Observable<RestaurantTable> {
    return this.http.patch<RestaurantTable>(`${this.base}/dashboard/${slug}/tables/${id}/`, data);
  }

  deleteTable(slug: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/dashboard/${slug}/tables/${id}/`);
  }

  /** The qr-code endpoint requires the same JWT auth as every other
   * dashboard call, so it can't be linked directly from an <img src> or
   * <a href> (those never carry our Authorization header) - fetch it as
   * a blob through HttpClient like any other authenticated request. */
  getTableQrCodeBlob(slug: string, id: string): Observable<Blob> {
    return this.http.get(`${this.base}/dashboard/${slug}/tables/${id}/qr-code/`, {
      responseType: 'blob',
    });
  }

  // --- Staff ---
  getStaff(slug: string): Observable<Paginated<RestaurantMembership>> {
    return this.http.get<Paginated<RestaurantMembership>>(`${this.base}/dashboard/${slug}/staff/`);
  }

  inviteStaff(
    slug: string,
    data: {
      email: string;
      first_name?: string;
      last_name?: string;
      password?: string;
      role: string;
    },
  ): Observable<RestaurantMembership> {
    return this.http.post<RestaurantMembership>(`${this.base}/dashboard/${slug}/staff/`, data);
  }

  removeStaff(slug: string, membershipId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/dashboard/${slug}/staff/${membershipId}/`);
  }

  // --- Orders ---
  getOrders(slug: string): Observable<Paginated<OrderListItem>> {
    return this.http.get<Paginated<OrderListItem>>(`${this.base}/dashboard/${slug}/orders/`);
  }

  getOrder(slug: string, id: string): Observable<Order> {
    return this.http.get<Order>(`${this.base}/dashboard/${slug}/orders/${id}/`);
  }

  updateOrderStatus(slug: string, id: string, status: OrderStatus): Observable<Order> {
    return this.http.patch<Order>(`${this.base}/dashboard/${slug}/orders/${id}/`, { status });
  }
}

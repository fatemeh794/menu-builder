export interface TablePublic {
  id: string;
  label: string;
  restaurant_slug: string;
  restaurant_name: string;
}

export interface RestaurantTable {
  id: string;
  label: string;
  secure_token: string;
  is_active: boolean;
  customer_url: string;
}

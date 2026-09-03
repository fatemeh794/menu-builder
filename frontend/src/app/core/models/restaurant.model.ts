export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo: string | null;
  cover_image: string | null;
  theme_primary_color: string;
  theme_secondary_color: string;
  theme_background_color: string;
  theme_border_radius: number;
}

export interface RestaurantSettings extends Restaurant {
  is_active: boolean;
}

export type MembershipRole = 'OWNER' | 'MANAGER' | 'STAFF';

export interface StaffUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface RestaurantMembership {
  id: number;
  user: StaffUser;
  role: MembershipRole;
  created_at: string;
}

export interface MyMembership {
  id: number;
  restaurant: Restaurant;
  role: MembershipRole;
}

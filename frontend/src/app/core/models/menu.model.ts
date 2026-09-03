export interface Category {
  id: string;
  name: string;
  image: string | null;
  order: number;
  is_active?: boolean;
}

export type OptionSelectionType = 'SINGLE' | 'MULTIPLE';

export interface MenuItemOption {
  id: string;
  name: string;
  extra_price: number;
  is_default: boolean;
  is_available: boolean;
  order?: number;
}

export interface MenuItemOptionGroup {
  id: string;
  name: string;
  selection_type: OptionSelectionType;
  is_required: boolean;
  min_select: number;
  max_select: number | null;
  options: MenuItemOption[];
  order?: number;
}

export interface MenuItem {
  id: string;
  category: string;
  name: string;
  description: string;
  base_price: number;
  image: string | null;
  is_available: boolean;
  is_active?: boolean;
  order?: number;
  option_groups: MenuItemOptionGroup[];
}

export interface Product {
  product_id: string;
  name: string;
  slug: string;
  description: string;
  sale_price: number;
  original_price: number;
  rating: number;
  image_1: string;
  image_2?: string;
  image_3?: string;
  image_4?: string;
  category_id: string;
  category_name?: string;
  category_slug?: string;
  brand_name: string;
  sub_brand_name?: string;
  stock_quantity: number;
  is_active: number;
  is_featured: number;
  is_hot_deal: number;
  created_at: string;
  updated_at: string;
  dealer_id: string;
} 
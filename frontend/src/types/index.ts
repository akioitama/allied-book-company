export type Category = {
  id: string;
  slug: string;
  name: string;
  coordinate_label?: string;
  description?: string;
};

export type Book = {
  id: string;
  slug: string;
  title: string;
  author: string;
  description: string;
  price_cents: number;
  cover_image_url: string | null;
  category_id: string;
  /** Resolved from the DB categories table when available. */
  category_slug?: string | null;
  category_name?: string | null;
  stock: number;
  is_featured: boolean;
  waypoint_order: number | null;
  isbn?: string | null;
  /** Stock-list CODE # from metadata.sku when available. */
  code?: string | null;
  related_slugs?: string[];
  /** Optional sale discount, e.g. 20 = 20% off */
  discount_percent?: number;
  is_new?: boolean;
  is_bestseller?: boolean;
  published_at?: string | null;
  publish_year?: number | null;
  format?: string | null;
  bind?: string | null;
  publisher?: string | null;
  /** Foreign list price from stock metadata (e.g. USD/GBP). */
  foreign_currency?: string | null;
  foreign_price?: number | null;
  /** Stock CON.RATE — foreign currency → PKR when available. */
  conversion_rate?: number | null;
};

export type CartItem = {
  bookId: string;
  slug: string;
  title: string;
  author: string;
  price_cents: number;
  cover_image_url: string | null;
  quantity: number;
};

export type OrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled";

export type Order = {
  id: string;
  status: OrderStatus;
  total_cents: number;
  shipping_address: {
    name: string;
    line1: string;
    city: string;
    region: string;
    postal: string;
    country: string;
  };
  created_at: string;
  items: {
    book_id: string;
    title: string;
    quantity: number;
    price_cents: number;
  }[];
};

export type CompassBearing = {
  label: string;
  degrees: number;
};

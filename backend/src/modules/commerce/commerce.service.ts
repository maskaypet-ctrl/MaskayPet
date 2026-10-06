import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateOrderDto } from './dto/commerce.dto';

@Injectable()
export class CommerceService {
  constructor(private readonly db: DatabaseService) {}

  async getProducts() {
    const res = await this.db.query(
      `SELECT * FROM public.products WHERE is_active = true ORDER BY price ASC`,
    );
    return res.rows;
  }

  async createOrder(userId: string, dto: CreateOrderDto, ipAddress?: string) {
    return this.db.transaction(async (client) => {
      let subtotal = 0;
      const resolvedItems: {
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }[] = [];

      for (const item of dto.items) {
        const prod = await client.query(
          `SELECT id, name, price, is_active FROM public.products WHERE id = $1`,
          [item.productId],
        );
        if (!prod.rows[0] || !prod.rows[0].is_active) {
          throw new BadRequestException(`El producto con ID ${item.productId} no está disponible.`);
        }
        const unitPrice = parseFloat(prod.rows[0].price);
        const itemTotal = unitPrice * item.quantity;
        subtotal += itemTotal;

        resolvedItems.push({
          productId: prod.rows[0].id,
          productName: prod.rows[0].name,
          quantity: item.quantity,
          unitPrice,
          totalPrice: itemTotal,
        });
      }

      let discount = 0;
      let couponId: string | null = null;
      if (dto.couponCode) {
        const coupon = await client.query(
          `SELECT id, discount_type, discount_value, valid_until, max_uses, times_used 
           FROM public.coupons 
           WHERE code = $1 AND valid_from <= CURRENT_DATE`,
          [dto.couponCode.trim().toUpperCase()],
        );
        if (coupon.rows[0]) {
          const c = coupon.rows[0];
          if (!c.valid_until || new Date(c.valid_until) >= new Date()) {
            if (!c.max_uses || c.times_used < c.max_uses) {
              couponId = c.id;
              if (c.discount_type === 'percent') {
                discount = (subtotal * parseFloat(c.discount_value)) / 100;
              } else {
                discount = Math.min(subtotal, parseFloat(c.discount_value));
              }
            }
          }
        }
      }

      const shippingCost = 10.0; // Standard shipping PEN
      const total = Math.max(0, subtotal - discount + shippingCost);

      // Create Order
      const orderRes = await client.query(
        `INSERT INTO public.orders (
           user_id, status, payment_status, shipping_address, shipping_city, shipping_country,
           subtotal, discount, shipping_cost, total, currency
         ) VALUES ($1, 'paid', 'approved', $2, $3, $4, $5, $6, $7, $8, 'PEN')
         RETURNING *`,
        [
          userId,
          dto.shippingAddress.trim(),
          dto.shippingCity.trim(),
          dto.shippingCountry || 'Perú',
          subtotal,
          discount,
          shippingCost,
          total,
        ],
      );
      const order = orderRes.rows[0];

      // Insert Order Items
      for (const item of resolvedItems) {
        await client.query(
          `INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [order.id, item.productId, item.productName, item.quantity, item.unitPrice],
        );
      }

      // Record coupon redemption
      if (couponId) {
        await client.query(
          `INSERT INTO public.coupon_redemptions (coupon_id, user_id, order_id)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [couponId, userId, order.id],
        );
        await client.query(
          `UPDATE public.coupons SET times_used = times_used + 1 WHERE id = $1`,
          [couponId],
        );
      }

      return {
        ...order,
        items: resolvedItems,
      };
    }, { userId, ipAddress });
  }

  async getMyOrders(userId: string) {
    const ordersRes = await this.db.query(
      `SELECT o.*,
              (SELECT json_agg(json_build_object(
                 'id', i.id,
                 'productId', i.product_id,
                 'productName', i.product_name,
                 'quantity', i.quantity,
                 'unitPrice', i.unit_price,
                 'totalPrice', i.total_price
               )) FROM public.order_items i WHERE i.order_id = o.id) as items
       FROM public.orders o
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [userId],
    );
    return ordersRes.rows;
  }
}

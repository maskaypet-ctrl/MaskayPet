import { api } from './api';
import { Order, Product } from '../types';

export const storeService = {
  async getProducts(): Promise<Product[]> {
    const res = await api.get<Product[]>('/commerce/products');
    return res.data;
  },

  async createOrder(data: {
    items: { productId: string; quantity: number }[];
    shippingAddress: string;
    shippingCity: string;
    shippingCountry?: string;
    couponCode?: string;
  }): Promise<Order> {
    const res = await api.post<Order>('/commerce/orders', data);
    return res.data;
  },

  async getMyOrders(): Promise<Order[]> {
    const res = await api.get<Order[]>('/commerce/my-orders');
    return res.data;
  },
};

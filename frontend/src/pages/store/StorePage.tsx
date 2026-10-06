import React, { useState, useEffect } from 'react';
import { storeService } from '../../services/store.service';
import { useToast } from '../../contexts/ToastContext';
import { Product, Order } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import styles from './Store.module.css';

export const StorePage: React.FC = () => {
  const { success, error } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Checkout modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('Lima');
  const [couponCode, setCouponCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStoreData = async () => {
    try {
      const [prods, myOrders] = await Promise.all([
        storeService.getProducts(),
        storeService.getMyOrders().catch(() => []),
      ]);
      setProducts(prods);
      setOrders(myOrders);
    } catch {
      error('Error al cargar catálogo de productos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, []);

  const handleOpenCheckout = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setCouponCode('');
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !shippingAddress.trim()) {
      error('Por favor ingresa la dirección de entrega');
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await storeService.createOrder({
        items: [{ productId: selectedProduct.id, quantity }],
        shippingAddress,
        shippingCity,
        couponCode: couponCode.trim() || undefined,
      });

      success(`¡Pedido #${order.id.substring(0, 8)} creado con éxito!`);
      setSelectedProduct(null);
      fetchStoreData();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al procesar el pedido');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <Spinner label="Cargando tienda oficial..." />;

  return (
    <div className={styles.storePage}>
      {/* Header Banner */}
      <div className={styles.banner}>
        <div className={styles.bannerText}>
          <div className={styles.bannerTag}>
            <span className="material-symbols-outlined">verified</span>
            <span>Tienda Oficial de Placas & Accesorios QR</span>
          </div>
          <h1 className={styles.bannerTitle}>Placas Inteligentes de Grado Militar</h1>
          <p className={styles.bannerDesc}>
            Fabricadas en aluminio anodizado y acero inoxidable con grabado láser indeleble y
            resistencia absoluta al agua, barro y desgaste diario.
          </p>
        </div>
      </div>

      {/* Products Grid */}
      <div className={styles.sectionHeader}>
        <div className={styles.titleWrap}>
          <span className={styles.titleBar}></span>
          <h2>Catálogo de Placas y Collares</h2>
        </div>
      </div>

      <div className={styles.productsGrid}>
        {products.map((product) => {
          const priceNum = typeof product.price === 'string' ? parseFloat(product.price) : product.price;

          return (
            <Card key={product.id} className={styles.productCard} padding="lg">
              <div className={styles.productImgWrap}>
                <div className={styles.productBadge}>
                  <Badge variant="primary" size="sm">
                    {product.sku}
                  </Badge>
                </div>
                <div className={styles.productIconBox}>
                  <span className="material-symbols-outlined">
                    {product.sku.includes('COL') ? 'pets' : 'qr_code_2'}
                  </span>
                </div>
              </div>

              <div className={styles.productBody}>
                <h3 className={styles.productTitle}>{product.name}</h3>
                <p className={styles.productDescription}>{product.description}</p>

                <div className={styles.productFooter}>
                  <div className={styles.priceRow}>
                    <span className={styles.currency}>S/</span>
                    <span className={styles.priceAmount}>{priceNum.toFixed(2)}</span>
                    <span className={styles.currencyCode}>PEN</span>
                  </div>

                  <Button
                    variant="primary"
                    icon="shopping_cart"
                    onClick={() => handleOpenCheckout(product)}
                  >
                    Comprar Ahora
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Orders History Section */}
      {orders.length > 0 && (
        <div className={styles.ordersSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.titleWrap}>
              <span className={styles.titleBar}></span>
              <h2>Mis Pedidos Realizados</h2>
            </div>
          </div>

          <div className={styles.ordersList}>
            {orders.map((ord) => (
              <Card key={ord.id} padding="md" className={styles.orderCard}>
                <div className={styles.orderTop}>
                  <div>
                    <h4 className={styles.orderId}>Pedido #{ord.id.substring(0, 8)}</h4>
                    <span className={styles.orderDate}>
                      {new Date(ord.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Badge variant="success" size="sm">
                    {ord.payment_status === 'approved' ? 'Pagado / Aprobado' : ord.payment_status}
                  </Badge>
                </div>

                <div className={styles.orderDetails}>
                  <p>
                    <strong>Envío:</strong> {ord.shipping_address}, {ord.shipping_city}
                  </p>
                  <p>
                    <strong>Total:</strong> S/ {Number(ord.total).toFixed(2)} PEN (
                    {ord.discount > 0 ? `Descuento aplicado: S/ ${Number(ord.discount).toFixed(2)}` : 'Sin cupón'})
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {selectedProduct && (
        <Modal
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          title={`Comprar: ${selectedProduct.name}`}
          subtitle="Completa tus datos de entrega para procesar tu pedido."
          icon="shopping_bag"
        >
          <form onSubmit={handleCreateOrder} className={styles.modalForm}>
            <div className={styles.productSummaryBox}>
              <div>
                <strong>{selectedProduct.name}</strong>
                <p className={styles.summarySub}>
                  Precio unitario: S/ {Number(selectedProduct.price).toFixed(2)} PEN
                </p>
              </div>

              <div className={styles.qtyControl}>
                <button
                  type="button"
                  className={styles.qtyBtn}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </button>
                <span className={styles.qtyNum}>{quantity}</span>
                <button
                  type="button"
                  className={styles.qtyBtn}
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </button>
              </div>
            </div>

            <Input
              label="Dirección de Envío *"
              placeholder="Ej: Av. Las Palmeras 450, Dpto 302"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              required
            />

            <Input
              label="Ciudad / Distrito *"
              placeholder="Ej: Miraflores, Lima"
              value={shippingCity}
              onChange={(e) => setShippingCity(e.target.value)}
              required
            />

            <Input
              label="Cupón de Descuento (Opcional)"
              placeholder="Ej: BIENVENIDO20 o MASCOTA10"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              helperText="Prueba con BIENVENIDO20 para 20% de descuento"
            />

            <div className={styles.pricingCalc}>
              <div className={styles.calcRow}>
                <span>Subtotal ({quantity} un.):</span>
                <span>S/ {(Number(selectedProduct.price) * quantity).toFixed(2)}</span>
              </div>
              <div className={styles.calcRow}>
                <span>Envío express:</span>
                <span>S/ 10.00</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              type="submit"
              fullWidth
              isLoading={isSubmitting}
              icon="check"
            >
              Confirmar & Generar Pedido
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
};

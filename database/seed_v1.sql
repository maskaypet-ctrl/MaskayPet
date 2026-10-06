-- ============================================================================
-- MASCOTAS QR - SEEDS INICIALES V1
-- ============================================================================

-- 1. Roles
INSERT INTO public.roles(code, name) VALUES
('customer', 'Customer'),
('admin', 'Administrator'),
('production_manager', 'Production Manager'),
('support', 'Support')
ON CONFLICT (code) DO NOTHING;

-- 2. Planes y Límites
INSERT INTO public.catalog_tiers(tier) VALUES ('free'), ('premium')
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limits (tier, max_pets, max_collaborators_per_pet, sms_credits_monthly, medical_document_retention_years)
VALUES
('free', 1, 1, 0, 1),
('premium', NULL, 5, 10, 10)
ON CONFLICT (tier) DO UPDATE SET
max_pets = EXCLUDED.max_pets,
max_collaborators_per_pet = EXCLUDED.max_collaborators_per_pet,
sms_credits_monthly = EXCLUDED.sms_credits_monthly,
medical_document_retention_years = EXCLUDED.medical_document_retention_years;

-- 3. Productos Demo para Placas QR Físicas
INSERT INTO public.products (id, name, description, sku, price, is_active)
VALUES
('00000000-0000-0000-0000-000000000001', 'Chapa QR Inteligente - Aluminio Anodizado', 'Placa de identificación ultraligera y resistente al agua con grabado láser indeleble.', 'TAG-ALU-01', 29.90, true),
('00000000-0000-0000-0000-000000000002', 'Chapa QR Inteligente - Acero Inoxidable Premium', 'Placa de máxima durabilidad con borde de silicona fluorescente para visibilidad nocturna.', 'TAG-SS-02', 49.90, true),
('00000000-0000-0000-0000-000000000003', 'Collar Inteligente con QR Integrado', 'Collar de alta resistencia con chapa QR integrada de perfil bajo.', 'COL-QR-01', 59.90, true)
ON CONFLICT (sku) DO NOTHING;

-- 4. Lote de Producción de Demostración
INSERT INTO public.tag_production_batches (id, batch_code, quantity, notes)
VALUES
('00000000-0000-0000-0000-000000000010', 'BATCH-2026-001', 10, 'Lote inicial de pruebas para desarrollo local y demo')
ON CONFLICT (batch_code) DO NOTHING;

-- 5. Tags QR de Prueba
INSERT INTO public.qr_tags (id, production_batch_id, public_code, status)
VALUES
('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000010', 'PET-QR-DEMO01', 'available'),
('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000010', 'PET-QR-DEMO02', 'available'),
('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000010', 'PET-QR-DEMO03', 'available')
ON CONFLICT (public_code) DO NOTHING;

-- 6. Códigos de Activación (Vouchers) de Prueba
INSERT INTO public.subscription_vouchers (id, code, tier, duration_days, status, notes)
VALUES
('00000000-0000-0000-0000-000000000201', 'ACT-PREM-1M-DEMO01', 'premium', 30, 'available', 'Código de prueba para 1 mes Premium'),
('00000000-0000-0000-0000-000000000202', 'VIP-PREM-6M-DEMO02', 'premium', 180, 'available', 'Código de prueba para 6 meses Premium'),
('00000000-0000-0000-0000-000000000203', 'PRO-PREM-1Y-DEMO03', 'premium', 365, 'available', 'Código de prueba para 1 año Premium')
ON CONFLICT (code) DO NOTHING;

-- 7. Cupones de Descuento de Prueba
INSERT INTO public.coupons (code, discount_type, discount_value, max_uses, valid_from)
VALUES
('BIENVENIDO20', 'percent', 20.00, 100, CURRENT_DATE),
('MASCOTA10', 'fixed', 10.00, 50, CURRENT_DATE)
ON CONFLICT (code) DO NOTHING;

-- 8. Clínicas Veterinarias Demo
INSERT INTO public.clinics (id, name, city, address, phone, is_partner)
VALUES
('00000000-0000-0000-0000-000000000301', 'Clínica Veterinaria San Martín', 'Lima', 'Av. Benavides 1230, Miraflores', '+51 987 654 321', true),
('00000000-0000-0000-0000-000000000302', 'Hospital Veterinario 24 Horas PetCare', 'Lima', 'Av. Javier Prado Este 4500, Surco', '+51 912 345 678', true)
ON CONFLICT DO NOTHING;

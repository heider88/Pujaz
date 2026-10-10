-- actualizar contraseñas de los usuarios semilla. 
-- El hash equivale a la contraseña: 123456
UPDATE users 
SET password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy' 
WHERE password_hash IS NULL OR password_hash = '';

-- saldo inicial de prueba
UPDATE wallets 
SET balance_available = 50000.00, balance_reserved = 0.00;

-- insertar movimientos base de recarga para justificar el saldo
INSERT INTO wallet_movements (wallet_id, amount, type)
SELECT id, 50000.00, 'recarga' FROM wallets;
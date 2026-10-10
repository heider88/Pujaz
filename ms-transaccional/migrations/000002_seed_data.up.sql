INSERT INTO users (id, name, email, password_hash, role) VALUES
(1, 'Ana', 'ana@correo.com', 'hash_secreto123', 'comprador'),
(2, 'Heider', 'heider@correo.com', 'hash_password123', 'vendedor'),
(3, 'Cata', 'cata@correo.com', 'hash_seguridad99', 'comprador');

-- Fondeo inicial (saldos) como depósitos en el ledger
INSERT INTO wallet_movements (user_id, amount, type) VALUES
(1, 15000.00, 'deposito'),
(3, 8000.00, 'deposito');

-- 10 subastas vinculadas a los _id de MongoDB
INSERT INTO auctions (item_id, status, current_price, ends_at) VALUES
('60d5ec49f1b2c3d4e5f60001', 'abierta', 100.00, NOW() + INTERVAL '3 days'),
('60d5ec49f1b2c3d4e5f60002', 'abierta', 250.00, NOW() + INTERVAL '3 days'),
('60d5ec49f1b2c3d4e5f60003', 'abierta', 50.00, NOW() + INTERVAL '3 days'),
('60d5ec49f1b2c3d4e5f60004', 'abierta', 800.00, NOW() + INTERVAL '3 days'),
('60d5ec49f1b2c3d4e5f60005', 'abierta', 120.00, NOW() + INTERVAL '3 days'),
('60d5ec49f1b2c3d4e5f60006', 'abierta', 300.00, NOW() + INTERVAL '3 days'),
('60d5ec49f1b2c3d4e5f60007', 'abierta', 450.00, NOW() + INTERVAL '3 days'),
('60d5ec49f1b2c3d4e5f60008', 'abierta', 900.00, NOW() + INTERVAL '3 days'),
('60d5ec49f1b2c3d4e5f60009', 'abierta', 60.00, NOW() + INTERVAL '3 days'),
('60d5ec49f1b2c3d4e5f60010', 'abierta', 1000.00, NOW() + INTERVAL '3 days');

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

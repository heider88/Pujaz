INSERT INTO wallets (id, user_id, balance_available, balance_reserved) VALUES
(1, 1, 500000.00, 0.00),
(2, 2, 500000.00, 0.00),
(3, 3, 500000.00, 0.00);

SELECT setval('wallets_id_seq', (SELECT MAX(id) FROM wallets));

INSERT INTO wallet_movements (wallet_id, amount, type) VALUES
(1, 500000.00, 'recarga'),
(2, 500000.00, 'recarga'),
(3, 500000.00, 'recarga');

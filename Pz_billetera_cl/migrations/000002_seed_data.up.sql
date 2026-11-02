INSERT INTO users (id, name, email, password_hash, role) VALUES
(1, 'Ana', 'ana@correo.com', '$2a$10$vKR3BfuHcEmHaGSLpFmiI.b.hlVWE7.I8oIumhCvr2Erm0PG.6gru', 'comprador'),
(2, 'Heider', 'heider@correo.com', '$2a$10$vKR3BfuHcEmHaGSLpFmiI.b.hlVWE7.I8oIumhCvr2Erm0PG.6gru', 'vendedor'),
(3, 'Cata', 'cata@correo.com', '$2a$10$vKR3BfuHcEmHaGSLpFmiI.b.hlVWE7.I8oIumhCvr2Erm0PG.6gru', 'comprador');

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

INSERT INTO wallets (user_id, balance_available, balance_reserved)
SELECT id, 500000.00, 0.00 FROM users;

INSERT INTO wallet_movements (wallet_id, amount, type)
SELECT id, 500000.00, 'recarga' FROM wallets;

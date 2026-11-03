INSERT INTO users (id, name, email, password_hash, role, status) VALUES
(1, 'Ana', 'ana@correo.com', '$2a$10$vKR3BfuHcEmHaGSLpFmiI.b.hlVWE7.I8oIumhCvr2Erm0PG.6gru', 'comprador', 'activa'),
(2, 'Heider', 'heider@correo.com', '$2a$10$vKR3BfuHcEmHaGSLpFmiI.b.hlVWE7.I8oIumhCvr2Erm0PG.6gru', 'vendedor', 'activa'),
(3, 'Cata', 'cata@correo.com', '$2a$10$vKR3BfuHcEmHaGSLpFmiI.b.hlVWE7.I8oIumhCvr2Erm0PG.6gru', 'comprador', 'activa');

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Mínimo 8 caracteres según el Gateway
    role VARCHAR(20) DEFAULT 'comprador',
    status VARCHAR(20) DEFAULT 'activa'
);

-- Libro contable (Ledger) de solo inserción para evitar alteraciones
CREATE TABLE wallet_movements (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(20) NOT NULL, -- Ej: 'deposito', 'apartado', 'liberacion'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auctions (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(24) NOT NULL UNIQUE, -- Cruce exacto con ObjectId de Mongo
    status VARCHAR(20) DEFAULT 'abierta',
    current_price DECIMAL(12,2) NOT NULL,
    ends_at TIMESTAMP NOT NULL
);

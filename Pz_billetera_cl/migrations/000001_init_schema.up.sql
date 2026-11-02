CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'comprador',
    status VARCHAR(20) DEFAULT 'activa',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wallets (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(id),
    balance_available DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    balance_reserved DECIMAL(12,2) NOT NULL DEFAULT 0.00
);

CREATE TABLE wallet_movements (
    id SERIAL PRIMARY KEY,
    wallet_id INT NOT NULL REFERENCES wallets(id),
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    auction_id INT NULL
);

ALTER TABLE wallet_movements ADD CONSTRAINT valid_movement_type 
    CHECK (type IN ('recarga', 'reserva por puja', 'reintegro', 'cobro'));

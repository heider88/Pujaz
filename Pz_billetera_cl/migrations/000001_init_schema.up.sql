CREATE TABLE wallets (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
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

CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    auction_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

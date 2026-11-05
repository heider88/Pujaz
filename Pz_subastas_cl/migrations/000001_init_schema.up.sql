CREATE TABLE auctions (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(24) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'abierta',
    current_price DECIMAL(12,2) NOT NULL,
    ends_at TIMESTAMP NOT NULL
);

CREATE TABLE bids (
    id SERIAL PRIMARY KEY,
    auction_id INT NOT NULL REFERENCES auctions(id),
    user_id INT NOT NULL,
    user_name VARCHAR(100) NOT NULL DEFAULT '',
    amount DECIMAL(12,2) NOT NULL,
    reservation_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

with open('Pz_billetera_cl/src/repositories/wallet_repository.go', 'r') as f:
    content = f.read()

content = content.replace("""	_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance_reserved = $2 WHERE id = $3", newAvailable, newReserved, wID) // wait available doesn't change
	
	_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance_reserved = $1 WHERE id = $2", newReserved, wID)""", """	_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance_reserved = $1 WHERE id = $2", newReserved, wID)""")

with open('Pz_billetera_cl/src/repositories/wallet_repository.go', 'w') as f:
    f.write(content)

with open('Pz_subastas_cl/main.go', 'r') as f:
    content = f.read()

replacement = """	ctrl := controllers.NewAuctionController(svc)

	// Cron job
	go func() {
		for {
			time.Sleep(1 * time.Minute)
			svc.CloseExpiredAuctions(context.Background())
		}
	}()

	mux := http.NewServeMux()"""

content = content.replace("	ctrl := controllers.NewAuctionController(svc)\n\n	mux := http.NewServeMux()", replacement)
content = content.replace('import (', 'import (\n\t"context"\n\t"time"')

with open('Pz_subastas_cl/main.go', 'w') as f:
    f.write(content)

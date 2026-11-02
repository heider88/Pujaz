with open('Pz_subastas_cl/main.go', 'r') as f:
    content = f.read()

content = content.replace('import (\n\t"context"\n\t"time"', 'import (')
content = content.replace('import (', 'import (\n\t"context"\n\t"time"')

with open('Pz_subastas_cl/main.go', 'w') as f:
    f.write(content)

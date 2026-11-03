import base64
import zlib
import urllib.request

mermaid_code = """
graph TD
    classDef fe fill:#E8F0FE,stroke:#3B6FD8,stroke-width:2px,color:#1E3A8A;
    classDef ag fill:#F1ECFD,stroke:#7C5CD6,stroke-width:2px,color:#4C2E9C;
    classDef cl fill:#FFF3E2,stroke:#E0922F,stroke-width:2px,color:#8A4B0F;
    classDef mq fill:#FEF2F2,stroke:#DC2626,stroke-width:2px,color:#991B1B;
    classDef db fill:#E8F6EB,stroke:#3E9E58,stroke-width:2px,color:#1F5E30;
    classDef asinc fill:#E0F2FE,stroke:#0284C7,stroke-width:2px,color:#0369A1;

    User((Usuario))
    
    subgraph Presentacion [Capa de Presentación]
        Pz_web_fe["Pz_web_fe<br/>(SSR Next.js)"]:::fe
        Pz_movil_fe["Pz_movil_fe<br/>(Flutter)"]:::fe
    end

    Pz_api_ag["Pz_api_ag<br/>(Gateway Node.js)"]:::ag

    subgraph Logica [Capa de Lógica de Negocio]
        Pz_subastas_cl["Pz_subastas_cl<br/>(Go)"]:::cl
        Pz_billetera_cl["Pz_billetera_cl<br/>(Go)"]:::cl
        Pz_usuarios_cl["Pz_usuarios_cl<br/>(Java)"]:::cl
        Pz_catalogo_cl["Pz_catalogo_cl<br/>(FastAPI)"]:::cl
        Pz_postpuja_cl["Pz_postpuja_cl<br/>(FastAPI)"]:::cl
    end

    subgraph Asincrona [Lógica Asíncrona]
        Pz_cierre_cl["Pz_cierre_cl<br/>(Cron Go)"]:::asinc
        Pz_notif_cl["Pz_notif_cl<br/>(Python)"]:::asinc
    end

    Pz_eventos_mq{"Pz_eventos_mq<br/>(RabbitMQ)"}:::mq

    subgraph Datos [Capa de Datos]
        db_sub[("Pz_subastas_db<br/>(PostgreSQL)")]:::db
        db_bill[("Pz_billetera_db<br/>(PostgreSQL)")]:::db
        db_usr[("Pz_usuarios_db<br/>(PostgreSQL)")]:::db
        db_cat[("Pz_catalogo_db<br/>(MongoDB)")]:::db
        db_post[("Pz_postpuja_db<br/>(MongoDB)")]:::db
        db_notif[("Pz_notif_db<br/>(Redis)")]:::db
    end

    User -->|Navegador| Pz_web_fe
    User -->|App| Pz_movil_fe
    
    Pz_web_fe -- GraphQL --> Pz_api_ag
    Pz_movil_fe -- GraphQL --> Pz_api_ag

    Pz_api_ag -- REST --> Pz_subastas_cl
    Pz_api_ag -- REST --> Pz_billetera_cl
    Pz_api_ag -- REST --> Pz_usuarios_cl
    Pz_api_ag -- REST --> Pz_catalogo_cl
    Pz_api_ag -- REST --> Pz_postpuja_cl

    Pz_cierre_cl -- REST --> Pz_subastas_cl

    Pz_subastas_cl -. AMQP .-> Pz_eventos_mq
    Pz_usuarios_cl -. AMQP .-> Pz_eventos_mq

    Pz_eventos_mq -. AMQP .-> Pz_billetera_cl
    Pz_eventos_mq -. AMQP .-> Pz_notif_cl
    Pz_eventos_mq -. AMQP .-> Pz_postpuja_cl
    Pz_eventos_mq -. AMQP .-> Pz_api_ag

    Pz_subastas_cl === db_sub
    Pz_billetera_cl === db_bill
    Pz_usuarios_cl === db_usr
    Pz_catalogo_cl === db_cat
    Pz_postpuja_cl === db_post
    Pz_notif_cl === db_notif
"""

compressed = zlib.compress(mermaid_code.encode('utf-8'), 9)
b64 = base64.urlsafe_b64encode(compressed).decode('ascii')
url = f"https://kroki.io/mermaid/png/{b64}"

req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as response, open('docs/vista-cc.png', 'wb') as out_file:
    out_file.write(response.read())

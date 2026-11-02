import yaml

with open('docker-compose.yml', 'r') as f:
    compose = yaml.safe_load(f)

# Update API gateway
compose['services']['pz-api-ag']['environment']['MS_SUBASTAS_URL'] = '${MS_SUBASTAS_URL:-http://pz-subastas-cl:8081}'
compose['services']['pz-api-ag']['environment']['MS_BILLETERA_URL'] = '${MS_BILLETERA_URL:-http://pz-billetera-cl:8082}'
del compose['services']['pz-api-ag']['environment']['MS_TRANSACCIONAL_URL']

compose['services']['pz-api-ag']['depends_on']['pz-subastas-cl'] = {'condition': 'service_healthy'}
compose['services']['pz-api-ag']['depends_on']['pz-billetera-cl'] = {'condition': 'service_healthy'}
del compose['services']['pz-api-ag']['depends_on']['pz-transaccional-cl']

# Add RabbitMQ
compose['services']['pz-eventos-mq'] = {
    'image': 'rabbitmq:3-management',
    'environment': {
        'RABBITMQ_DEFAULT_USER': 'guest',
        'RABBITMQ_DEFAULT_PASS': 'guest'
    },
    'ports': ['15672:15672'],
    'networks': ['backend'],
    'healthcheck': {
        'test': ["CMD", "rabbitmq-diagnostics", "-q", "ping"],
        'interval': '10s',
        'timeout': '5s',
        'retries': 5,
        'start_period': '20s'
    }
}

# Add Subastas and Billetera
compose['services']['pz-subastas-cl'] = {
    'build': {'context': './Pz_subastas_cl'},
    'environment': {
        'DATABASE_URL': 'postgres://${POSTGRES_USER:-pujaz_user}:${POSTGRES_PASSWORD:?Define POSTGRES_PASSWORD}@pz-transaccional-db:5432/pujaz_subastas?sslmode=disable',
        'PORT': '8081',
        'RABBITMQ_URL': '${RABBITMQ_URL:-amqp://guest:guest@pz-eventos-mq:5672/}'
    },
    'networks': ['backend', 'data'],
    'depends_on': {
        'pz-transaccional-db': {'condition': 'service_healthy'},
        'pz-eventos-mq': {'condition': 'service_healthy'}
    },
    'healthcheck': {
        'test': ["CMD", "wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8081/health"],
        'interval': '10s',
        'timeout': '5s',
        'retries': 5
    }
}

compose['services']['pz-billetera-cl'] = {
    'build': {'context': './Pz_billetera_cl'},
    'environment': {
        'DATABASE_URL': 'postgres://${POSTGRES_USER:-pujaz_user}:${POSTGRES_PASSWORD:?Define POSTGRES_PASSWORD}@pz-transaccional-db:5432/pujaz_billetera?sslmode=disable',
        'PORT': '8082',
        'RABBITMQ_URL': '${RABBITMQ_URL:-amqp://guest:guest@pz-eventos-mq:5672/}'
    },
    'networks': ['backend', 'data'],
    'depends_on': {
        'pz-transaccional-db': {'condition': 'service_healthy'},
        'pz-eventos-mq': {'condition': 'service_healthy'}
    },
    'healthcheck': {
        'test': ["CMD", "wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8082/health"],
        'interval': '10s',
        'timeout': '5s',
        'retries': 5
    }
}

# Remove monolithic service
del compose['services']['pz-transaccional-cl']

# Update postpuja with RabbitMQ
compose['services']['pz-postpuja-cl']['environment']['RABBITMQ_URL'] = '${RABBITMQ_URL:-amqp://guest:guest@pz-eventos-mq:5672/}'
compose['services']['pz-postpuja-cl']['depends_on']['pz-eventos-mq'] = {'condition': 'service_healthy'}

# Set up postgres init
if 'volumes' not in compose['services']['pz-transaccional-db']:
    compose['services']['pz-transaccional-db']['volumes'] = []
compose['services']['pz-transaccional-db']['volumes'].append('./postgres-init/init.sql:/docker-entrypoint-initdb.d/init.sql:ro')

with open('docker-compose.yml', 'w') as f:
    yaml.dump(compose, f, sort_keys=False)

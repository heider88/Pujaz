FROM nginx:stable-alpine

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf
COPY waf/ /etc/nginx/waf/
# Copia por defecto; Compose monta ./listas encima para editarlas sin reconstruir.
COPY listas/ /etc/nginx/listas/

EXPOSE 8080 8081

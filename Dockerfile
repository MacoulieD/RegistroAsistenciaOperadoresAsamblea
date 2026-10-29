# Etapa 1: instala dependencias de producción con el lockfile exacto
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Etapa 2: imagen final, solo lo necesario para correr
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production

# Usuario sin privilegios, creado antes de copiar para no necesitar un
# chown -R después (eso duplicaría en una capa nueva el peso completo de
# node_modules solo por cambiarle el dueño).
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --chown=appuser:appgroup . .

USER appuser

EXPOSE 30023
CMD ["node", "server.js"]

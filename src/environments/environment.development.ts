// CONFIGURACIÓN DE DESARROLLO
// Este puerto debe coincidir con el del proxy-server (archivo .env)
const PROXY_PORT = 8080;

export const environment = {
  production: false,
  proxyUrl: `http://localhost:${PROXY_PORT}/proxy`
};

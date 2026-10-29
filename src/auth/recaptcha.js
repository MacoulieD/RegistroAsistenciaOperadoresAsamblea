/**
 * Verifica el token de Google reCAPTCHA en el backend.
 * @param {string} token El token generado por el widget reCAPTCHA.
 * @returns {Promise<object>} Respuesta de Google con success y otros campos.
 */
async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) {
    throw new Error('RECAPTCHA_SECRET no está configurado en el entorno.');
  }

  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: secret,
      response: token
    })
  });

  return await response.json();
}

module.exports = { verifyRecaptcha };

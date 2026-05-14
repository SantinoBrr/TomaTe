exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!MP_ACCESS_TOKEN) {
    console.error('MP_ACCESS_TOKEN no configurado');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Configuración de pago incompleta' }),
    };
  }

  try {
    const { items, payer, back_urls } = JSON.parse(event.body);

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items,
        payer,
        back_urls,
        auto_return: 'approved',
        statement_descriptor: 'Toma Te',
        expires: false,
      }),
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('MP API error:', data);
      return {
        statusCode: mpResponse.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: data.message || 'Error al crear la preferencia de pago' }),
      };
    }

    const isSandbox = MP_ACCESS_TOKEN.startsWith('TEST-');
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        checkout_url: isSandbox ? data.sandbox_init_point : data.init_point,
        is_sandbox: isSandbox,
        id: data.id,
      }),
    };
  } catch (err) {
    console.error('Error interno:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Error interno del servidor' }),
    };
  }
};

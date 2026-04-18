import http from 'http';

async function post(path, body, cookies = '') {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(cookies ? { Cookie: cookies } : {}),
      },
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ body: JSON.parse(body), headers: res.headers }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// 1. Login to admin
const loginRes = await post('/admin-api', {
  query: 'mutation { login(username: "superadmin", password: "superadmin") { ...on CurrentUser { id identifier } } }',
});
console.log('Login:', loginRes.body);
const setCookie = loginRes.headers['set-cookie'] || [];
const sessionCookie = setCookie.map(c => c.split(';')[0]).join('; ');
console.log('Cookie:', sessionCookie);

// 2. List payment methods
const pmRes = await post('/admin-api', {
  query: '{ paymentMethods { totalItems items { id code name enabled } } }',
}, sessionCookie);
console.log('Payment Methods:', JSON.stringify(pmRes.body, null, 2));

// 3. Check eligible payment methods from shop
const shopPmRes = await post('/shop-api', {
  query: '{ eligiblePaymentMethods { id code name isEligible eligibilityMessage } }',
});
console.log('Eligible Payment Methods (shop):', JSON.stringify(shopPmRes.body, null, 2));

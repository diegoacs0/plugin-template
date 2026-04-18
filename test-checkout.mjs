import http from 'http';

// Maintain a cookie jar
const jar = {};

function parseCookies(setCookieHeaders) {
  for (const c of setCookieHeaders || []) {
    const [kv] = c.split(';');
    const eqIdx = kv.indexOf('=');
    if (eqIdx > 0) {
      const k = kv.substring(0, eqIdx).trim();
      const v = kv.substring(eqIdx + 1).trim();
      jar[k] = v;
    }
  }
}

function cookieHeader() {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const cookie = cookieHeader();
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(cookie ? { Cookie: cookie } : {}),
      },
    };
    const req = http.request(options, (res) => {
      let b = '';
      parseCookies(res.headers['set-cookie']);
      res.on('data', (chunk) => (b += chunk));
      res.on('end', () => resolve(JSON.parse(b)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function shopPost(query) {
  return post('/shop-api', { query });
}

console.log('\n=== 1. Add item to order ===');
console.log('Initial cookies:', JSON.stringify(jar));
const addItem = await shopPost(`mutation { addItemToOrder(productVariantId: 1, quantity: 1) {
  __typename
  ... on Order { id code state }
  ... on ErrorResult { errorCode message }
}}`);
console.log(JSON.stringify(addItem, null, 2));
console.log('Cookies after add:', JSON.stringify(jar));

console.log('\n=== 2. Set customer ===');
const setCustomer = await shopPost(`mutation { setCustomerForOrder(input: {
  emailAddress: "test-flow@example.com", firstName: "Test", lastName: "User"
}) {
  __typename
  ... on Order { id }
  ... on ErrorResult { errorCode message }
}}`);
console.log(JSON.stringify(setCustomer, null, 2));

console.log('\n=== 3. Set shipping address ===');
const setAddress = await shopPost(`mutation { setOrderShippingAddress(input: {
  fullName: "Test User", streetLine1: "123 Test St", city: "Testville",
  postalCode: "12345", countryCode: "US"
}) {
  __typename
  ... on Order { id state }
  ... on ErrorResult { errorCode message }
}}`);
console.log(JSON.stringify(setAddress, null, 2));

console.log('\n=== 4. Get eligible shipping methods ===');
const shippingMethodsRes = await shopPost(`{ eligibleShippingMethods { id name price } }`);
console.log(JSON.stringify(shippingMethodsRes, null, 2));

const methods = shippingMethodsRes?.data?.eligibleShippingMethods || [];
if (methods.length > 0) {
  console.log('\n=== 5. Set shipping method ===');
  const ids = methods.map(m => `"${m.id}"`).join(', ');
  const setMethod = await shopPost(`mutation { setOrderShippingMethod(shippingMethodId: [${ids}]) {
    __typename
    ... on Order { id state shippingLines { shippingMethod { id name } } }
    ... on ErrorResult { errorCode message }
  }}`);
  console.log(JSON.stringify(setMethod, null, 2));
} else {
  console.log('\n⚠️  NO SHIPPING METHODS AVAILABLE — this will block ArrangingPayment transition!');
}

console.log('\n=== 6. Eligible payment methods (with active order) ===');
const eligiblePm = await shopPost(`{ eligiblePaymentMethods { id code name isEligible eligibilityMessage } }`);
console.log(JSON.stringify(eligiblePm, null, 2));

console.log('\n=== 7. Transition to ArrangingPayment ===');
const transition = await shopPost(`mutation { transitionOrderToState(state: "ArrangingPayment") {
  __typename
  ... on Order { id code state }
  ... on OrderStateTransitionError { errorCode message transitionError fromState toState }
  ... on ErrorResult { errorCode message }
}}`);
console.log(JSON.stringify(transition, null, 2));

const transitionType = transition?.data?.transitionOrderToState?.__typename;
if (transitionType !== 'Order') {
  console.log('\n❌ Transition failed — cannot proceed to payment');
  process.exit(1);
}

console.log('\n=== 8. Add payment ===');
const payment = await shopPost(`mutation { addPaymentToOrder(input: { method: "auto-settle", metadata: {} }) {
  __typename
  ... on Order { id code state }
  ... on ErrorResult { errorCode message }
  ... on PaymentFailedError { errorCode message paymentErrorMessage }
  ... on PaymentDeclinedError { errorCode message paymentErrorMessage }
  ... on OrderPaymentStateError { errorCode message }
  ... on IneligiblePaymentMethodError { errorCode message eligibilityCheckerMessage }
}}`);
console.log(JSON.stringify(payment, null, 2));

import { always, both as and, cond as _cond, propEq, pathEq, T } from 'ramda';

import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as readline from 'readline';
import * as cors from 'cors';

const cond: any = _cond;

const mapReq = fn => (req, res) => {
  const { status = 200, headers = {}, body = {} } = fn(req);
  res.status(status);
  res.removeHeader('X-Powered-By');
  res.removeHeader('ETag');
  res.removeHeader('Date');
  res.set('Access-Control-Allow-Origin', '*');
  Object.keys(headers).forEach(key => res.set(key, headers[key]));
  res.json(body);
  return res;
};

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

const notAuthorized = [T, always({ status: 403, body: { error: 'Not authorized' } })];
const checkToken = pathEq(['headers', 'authtoken'], 'THE-S3KRIT-T0K3N');
const checkPerf = pathEq(['query', 'performance'], 'true');

app.use((req, { }, next) => {
  console.log(req.method.toUpperCase(), req.url);
  next();
});

app.get('/', ({ }, res) => {
  res.send('Very Real Financial Services, LLC — API v1.0');
})

app.post('/token', mapReq(cond([
  [
    propEq('body', { username: 'test@account', password: 's3krit' }),
    always({ body: { token: 'THE-S3KRIT-T0K3N' } })
  ],
  notAuthorized
])));

app.get('/accounts', mapReq(cond([
  [and(checkToken, checkPerf), always({
    body: [
      {
        _links: { details: { href: 'http://localhost:1138/accounts/1', title: 'The Important One' } },
        performance: { qtd: 1.5, mtd: -1.1, ytd: 5 }
      },
      {
        _links: { details: { href: 'http://localhost:1138/accounts/2', title: 'The Other One' } },
        performance: { ytd: 1.5, mtd: -2.1, qtd: 12 }
      }
    ]
  })],
  [checkToken, always({
    body: [
      { _links: { details: { href: 'http://localhost:1138/accounts/1', title: 'The Important One' } } },
      { _links: { details: { href: 'http://localhost:1138/accounts/2', title: 'The Other One' } } },
    ]
  })],
  notAuthorized
])));

app.get('/accounts/1', mapReq(cond([
  [checkToken, always({
    body: {
      overview: {
        holdings: [{
          name: 'Acme, Inc.',
          ticker: 'ACM',
          quantity: 5,
          price: 1.11
        }, {
          name: 'Macrosaft',
          ticker: 'MASF',
          quantity: 11,
          price: 25.01
        }],
        institution: '✨ Savings Bank',
        lastUpdated: 1551753053,
        number: 11001001001
      }
    }
  })],
  notAuthorized
])));

app.get('/accounts/2', mapReq(cond([
  [checkToken, always({
    body: {
      _links: {
        holdings: { href: 'http://localhost:1138/accounts/2/holdings' }
      },
      institution: 'Investments Iz Us',
      lastUpdated: 1551753053,
      value: 101.09,
      number: 11001001002
    }
  })],
  notAuthorized
])));

app.get('/accounts/2/holdings', mapReq(cond([
  [checkToken, always({
    body: [{
      name: 'Goodnight Moonshot',
      ticker: 'GMI',
      quantity: 5000,
      price: 0.22
    }, {
      name: 'BearBNB',
      ticker: 'BBNB',
      quantity: 40,
      price: 15.28
    }]
  })],
  notAuthorized
])));











app.get('/interactive', (req, res) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Test value: ', (result) => {
    res.json({ result }).status(200);
    rl.close();
  });
});

app.listen(1138, console.log.bind(console, `Test service running at http://localhost:1138`));

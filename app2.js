const express = require('express');
const cors = require('cors');

const moment = require('moment-timezone');
// require('moment/locale/ja');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 1234;

app.use(cors());

app.get('/abc', async (req, res) => {
  console.log('kita');

  const now = moment(new Date());
  now.tz('Asia/Tokyo').format('ha z');
  console.log(now.format('YYYY-MM-DD-HH'));

  res.json({ name: process.env.NAME11 });
});

app.listen(port, async () => {
  console.log(port);

  const now = moment(new Date());
  now.tz('Asia/Tokyo').format('ha z');
  console.log(now.format('YYYY-MM-DD-HH'));
});

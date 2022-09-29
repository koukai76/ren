const express = require('express');
const cors = require('cors');

const moment = require('moment');
require('moment/locale/ja');
moment.locale('ja');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 1234;

app.use(cors());

app.get('/abc', async (req, res) => {
  console.log('kita');
  console.log(moment().format('YYYY-MM-DD-HH'));
  res.json({ name: process.env.NAME11 });
});

app.listen(port, async () => {
  console.log(port);
});

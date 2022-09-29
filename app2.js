const express = require('express');
const cors = require('cors');
const moment = require('moment');

const app = express();
const port = process.env.PORT || 1234;

app.use(cors());

app.get('/abc', async (req, res) => {
  console.log('kita');
  console.log(moment().format('YYYY-MM-DD'));
  res.json({ name: 'taro' });
});

app.listen(port, async () => {
  console.log(port);
});

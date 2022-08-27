const express = require('express');
const fetch1 = require('isomorphic-fetch');

const app = express();

app.get('/abc', async (req, res) => {
  const ret = await fetch1('http://httpbin.org/ip', {
    method: 'get',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
    },
  });
  res.json({ name: 'たろう', age: 24, ip: await ret.json() });
});

app.listen(process.env.PORT || 3001, () =>
  console.log(`Example app listening on port ${port}!`)
);

const puppeteer = require('puppeteer');
const express = require('express');
const fetch1 = require('isomorphic-fetch');

const app = express();
const port = process.env.PORT || 3001;

const pup = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  const page = await browser.newPage();
  page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36'
  );

  const res = await page.goto('https://www.serversus.work/', {
    waitUntil: 'networkidle0',
  });

  if (res.status() !== 200) {
    return false;
  }

  const ret = await page.evaluate(() => {
    return document.querySelectorAll('.article-list li')[0].textContent;
  });

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // uid
      to: process.env.EXPO_ID,
      title: 'render',
      body: ret,
      priority: 'high',
      sound: 'default',
    }),
  });

  browser.close();
  return ret;
};

app.get('/abc', async (req, res) => {
  try {
    const ret = await fetch1('http://httpbin.org/ip', {
      method: 'get',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
      },
    });

    res.json({
      name: 'ichiro',
      age: 24,
      ip: await ret.json(),
    });
  } catch (e) {
    res.json({ emessage: e });
  }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

try {
  pup();
} catch (error) {
  console.log(error);
}

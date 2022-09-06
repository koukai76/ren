const express = require('express');
const cheerio = require('cheerio');
const fetch1 = require('isomorphic-fetch');
const mysql = require('mysql2');
const cron = require('node-cron');
const cors = require('cors');

let arr = [];

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const query = (sql, params, connection) => {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, results, fields) => {
      if (err) {
        reject(err);
        return;
      }

      resolve({ results: results, fields: fields });
    });
  });
};

/** UPDATE*/
const upd = async (json, id, connection) => {
  await query(
    'UPDATE kaitori SET json = ?, update_at = ? WHERE id = ?',
    [json, new Date(), id],
    connection
  );
};

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());

app.get('/get', async (req, res) => {
  try {
    const q = req.query['q'];
    console.log(q);

    const ret = await query('SELECT * FROM kaitori where id = ?', [Number(q)]);

    res.json(JSON.parse(ret.results[0]));
  } catch (e) {
    res.json([]);
  }
});

app.get('/abc', async (req, res) => {
  res.json({ name: 'taro' });
});

app.listen(port, async () => {
  console.log(port);
});

// 価格取得
const getPrice = (list, table) => {
  const num = Array.from(list).length;

  return [...Array(num)].reduce((acc, _, i) => {
    const key = list.eq(i).css('background-position');

    if (key !== '-100px') {
      acc += table[key];
    }

    return acc;
  }, '');
};

const method = async (num, url) => {
  const res = await fetch1(`${url}?pageno=${num}`, {
    method: 'get',
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
    },
  });

  if (res.status !== 200) {
    return true;
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const item = $('.item');

  if (item.length === 0) {
    throw new Error();
  }

  const ocr_url =
    'https://www.kaitorishouten-co.jp' +
    html.match(/\/products\/encrypt_price\/(\w+)/g)[0].replace('"', '');

  const ocr_res = await fetch1(
    `https://script.google.com/macros/s/AKfycbwiWzeH5JZHC3pp4klvLGsyf3C9cfk1jxPHq5r0U1mo2KLz16idCBs8KBwwRdUxR_lu0g/exec?q=${ocr_url}`,
    {
      method: 'get',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
      },
    }
  );

  const obj = await ocr_res.json();
  const text = obj['text'];

  if (text === 'e') {
    return true;
  }

  const table = [...Array(text.length)].reduce((acc, _, index) => {
    acc['-' + index * 10 + 'px'] = text.charAt(index);
    return acc;
  }, {});

  Array.from(item).map((_, i) => {
    const _arr = [];

    // 商品名
    _arr.push(item.eq(i).find('.item-title').text().trim());

    // JAN
    _arr.push(item.eq(i).find('.product-code-default').eq(1).text());

    // 新品買取価格・中古買取価格
    [...Array(2)].reduce((pacc, _, ri) => {
      if (item.eq(i).find('.item-price').eq(ri).text().trim() !== '') {
        const price = getPrice(
          item.eq(i).find('.item-price').eq(pacc).find('.encrypt-num'),
          table
        );

        _arr.push(price);
        pacc++;
      } else {
        _arr.push('');
      }

      return pacc;
    }, 0);

    arr.push(_arr);
  });
};

const main = async (url, id) => {
  const connection = mysql.createConnection({
    host: process.env.host,
    database: process.env.database,
    user: process.env.user,
    password: process.env.password,
    ssl: {
      rejectUnauthorized: true,
    },
  });

  arr = [];
  try {
    let flag = false;

    for (let i = 1; i < 100; i++) {
      console.log(i);
      const ret = await method(i, url);

      if (flag === true && ret === true) {
        break;
      }

      flag = ret;
    }

    await upd(JSON.stringify(arr), id, connection);
    console.log('fin.');
  } catch {
    await upd(JSON.stringify(arr), id, connection);
    console.log('fin');
  } finally {
    connection.end();
  }
};

cron.schedule('*/10 * * * *', async () => {
  try {
    await fetch1(`https://${process.env.MYDOMAIN}/abc`);

    await main(
      'https://www.kaitorishouten-co.jp/products/list_keitai_new/9',
      9
    );
    await main(
      'https://www.kaitorishouten-co.jp/products/list_kaden_new/10',
      10
    );
    await main(
      'https://www.kaitorishouten-co.jp/products/list_nitiyouhin_new/11',
      11
    );
  } catch (error) {
    console.log(error);
  }
});

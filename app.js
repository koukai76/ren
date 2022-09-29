const express = require('express');
const cheerio = require('cheerio');
const fetch1 = require('isomorphic-fetch');
const mysql = require('mysql2');
// const cron = require('node-cron');
const cors = require('cors');
const moment = require('moment');

let arr = [];

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const chome = async () => {
  try {
    const res = await fetch1(`https://www.1-chome.com/keitai`, {
      method: 'get',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
      },
    });

    if (res.status !== 200) {
      return;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const target = $('.table tbody tr');

    const ret = Array.from(target).reduce((acc, _, index) => {
      if (target.eq(index).attr('class') == null) {
        return acc;
      }

      const tr = target.eq(index).find('td').eq(2).find('tbody tr');

      const genre = Array.from(tr).map((_, i) => {
        const obj = {
          name: tr.eq(i).find('td').eq(0).text().trim(),
          new: tr
            .eq(i)
            .find('td')
            .eq(1)
            .find('span')
            .text()
            .trim()
            .replace('￥', '')
            .replace(',', ''),
          second: tr
            .eq(i)
            .find('td')
            .eq(2)
            .find('span')
            .text()
            .trim()
            .replace('￥', '')
            .replace(',', ''),
        };

        const check_new = tr
          .eq(i)
          .find('td')
          .eq(1)
          .text()
          .trim()
          .replace('￥', '')
          .replace(',', '');
        const check_second = tr
          .eq(i)
          .find('td')
          .eq(2)
          .text()
          .trim()
          .replace('￥', '')
          .replace(',', '');

        if (check_new.indexOf('\n') !== -1) {
          obj.new = check_new.replace('\n', '').replace(/ /g, '');
        }

        if (check_second.indexOf('\n') !== -1) {
          obj.new = check_second.replace('\n', '').replace(/ /g, '');
        }

        return obj;
      });

      acc.push({
        name: target.eq(index).find('td').eq(1).text().trim(),
        genre: genre,
      });
      return acc;
    }, []);

    return ret;
  } catch (error) {
    return [];
  }
};

const create_con = () => {
  const connection = mysql.createConnection({
    host: process.env.host,
    database: process.env.database,
    user: process.env.user,
    password: process.env.password,
    ssl: {
      rejectUnauthorized: true,
    },
  });

  return connection;
};

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
  const connection = create_con();
  try {
    if (req.header('Authorization') !== 'Bearer abc') {
      res.json([]);
      throw new Error();
    }

    const q = req.query['q'];

    const ret = await query(
      'SELECT * FROM kaitori where id = ?',
      [Number(q)],
      connection
    );

    res.json(ret.results[0]);
  } catch (e) {
    res.json([]);
  } finally {
    connection.end();
  }
});

app.get('/abc', async (req, res) => {
  console.log('kita');
  console.log(moment().format('YYYY-MM-DD'));
  res.json({ name: 'taro' });
});

// app.get('/chome', async (req, res) => {
//   try {
//     if (req.header('Authorization') !== 'Bearer abc') {
//       throw new Error();
//     }
//     res.send(await chome());
//   } catch (error) {
//     res.send([]);
//   }
// });

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

  const ocr_res = await fetch1(`${process.env.gas}?q=${ocr_url}`, {
    method: 'get',
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
    },
  });

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
  const connection = create_con();

  arr = [];
  try {
    let flag = false;

    for (let i = 1; i < 100; i++) {
      const ret = await method(i, url);

      if (flag === true && ret === true) {
        break;
      }

      flag = ret;
    }

    await upd(JSON.stringify(arr), id, connection);
  } catch {
    await upd(JSON.stringify(arr), id, connection);
  } finally {
    connection.end();
  }
};

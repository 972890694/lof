const express = require('express');
const { getAll } = require('./index');
const fs = require('fs');

const app = express();
const port = 3001;

const historyPath = `${__dirname}/history.json`;

app.get('/getEstimatePrice', (req, res) => {
  Promise.all(getAll()).then(result => {
    const total = result.reduce((prv, cur) => parseInt((cur.estimatePrice + prv) * 100) / 100, 0);
    res.send({
      code: 0,
      data: {
        list: result,
        total,
      },
      message: '',
    })
  })
})

app.get('/getHistory', (req, res) => {
  const list = JSON.parse(fs.readFileSync(historyPath));
  res.send({
    code: 0,
    data: list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    message: '',
  });
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

const express = require('express');
const { getAll } = require('./index');
const app = express();
const port = 3001;

app.get('/getEstimatePrice', (req, res) => {
  Promise.all(getAll()).then(result => {
    const total = result.reduce((prv, cur) => parseInt(cur.estimatePrice * 100) / 100 + prv, 0);
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

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

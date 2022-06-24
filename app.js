const express = require('express');
const { getAll } = require('./index');
const app = express();
const port = 3001;

app.get('/getEstimatePrice', (req, res) => {
  // console.log(data);
  Promise.all(getAll()).then(result => {
    res.send({
      code: 0,
      data: result,
      message: '',
    })
  })
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

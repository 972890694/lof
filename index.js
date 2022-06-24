const fs = require('fs');
const axios = require('axios');
const moment = require('moment');

const baseUrl = 'http://fundgz.1234567.com.cn/js';
const dataTempPath = `${__dirname}/dataTemp.json`;

const temp = JSON.parse(fs.readFileSync(dataTempPath));
const data = temp.data.filter(e => e.isHold);

// 估值总收益
let allEstimatePrice = 0;
const rate = 100;

// 请求天天基金网获取估值
function getEstimatePrice(item) {
  return axios.get(`${baseUrl}/${item.code}.js?rt=${moment().valueOf()}`)
    .then(res => {
      // let str = res.data.replace('jsonpgz(', '');
      // str = str.replace(');', '');
      // const { gszzl } = JSON.parse(str);
      const fn = new Function('jsonpgz', `return ${res.data}`);
      const data = fn((data) => data);
      const { gszzl, gztime } = data;
      item.estimateRate = gszzl;
      item.updateTime = gztime;
      const curEstimatePrice = parseInt((item.estimateRate / rate * item.basePrice) * 100) / 100;
      allEstimatePrice = parseInt((allEstimatePrice + curEstimatePrice) * 100) / 100;
      item.estimatePrice = curEstimatePrice;
      return Promise.resolve(item);
    })
}

const axiosList = [];
// 循环天天基金发请求
data.forEach((item) => {
  axiosList.push(getEstimatePrice(item));
});

// Promise.all(axiosList).then(() => {
//   data.forEach((item) => {
//     console.log(`rate: ${item.estimateRate}, 估值：${item.estimatePrice}, ${item.name}, basePrice: ${item.basePrice}`);
//   })

//   console.log('-------------------- 收益 ---------------------------------------');
//   console.log(`${moment().format('YYYY-MM-DD HH:mm:ss')}估值收益：${(allEstimatePrice)}元 `);
// })

exports.axiosList = axiosList;

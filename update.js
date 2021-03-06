const fs = require('fs');
const axios = require('axios');
const superagent = require("superagent");
const cheerio = require("cheerio");
const moment = require('moment');

const baseUrl = 'http://fundgz.1234567.com.cn/js';
const realRateUrl = 'http://fund.eastmoney.com';
const dataTempPath = `${__dirname}/dataTemp.json`;
const estimatePath = `${__dirname}/estimate.json`;
const historyPath = `${__dirname}/history.json`;

const update = () => {
  const date = moment().format('YYYY-MM-DD');
  const temp = JSON.parse(fs.readFileSync(dataTempPath));
  temp.date = date;
  const yeastDay = moment(date).subtract({ day: 1 }).format('YYYY-MM-DD');
  const historyData = JSON.parse(fs.readFileSync(historyPath));
  const row = historyData[historyData.length - 1];

  if (row.date === yeastDay) {
    temp.data.forEach(e => {
      row.data.forEach(item => {
        if (e.code === item.code && e.isHold) {
          e.basePrice = item.basePrice;
          e.isUpdate = false;
          e.estimateRate = 0;
          e.realRate = 0;
          e.realPrice = 0;
        }
      })
    });
  }

  // 百分比
  const rate = 100;
  // 估值总收益
  let allEstimatePrice = 0;
  // 净值总收益
  let allRealPrice = 0;

  // 当天净值全部更新
  if (row.date === date && row.data.every(e => e.isUpdate)) {
    console.log('-------------------- 净值 ---------------------------------------');
    row.data.forEach(item => {
      console.log(`${item.name}：${item.realPrice}元`);
    });

    console.log('-------------------- 收益 ---------------------------------------');
    console.log(`${moment().format('YYYY-MM-DD HH:mm:ss')}实际收益：${(row.todayEarnings)}元`);
    return;
  }

  const data = temp.data.filter(e => e.isHold);
  const flag = moment().format('HH') >= 22;

  let axiosList = [];

  // 循环天天基金发请求
  data.forEach((item) => {
    axiosList.push(!flag ? getEstimatePrice(item) : getRealPrice(item));
  });

  // 请求天天基金网获取估值
  function getEstimatePrice(item) {
    return axios.get(`${baseUrl}/${item.code}.js?rt=${new Date().getTime()}`)
      .then(res => {
        let str = res.data.replace('jsonpgz(', '');
        str = str.replace(');', '');
        const { gszzl } = JSON.parse(str);
        item.estimateRate = gszzl;
        const curEstimatePrice = parseInt((item.estimateRate / rate * item.basePrice) * 100) / 100;
        allEstimatePrice = parseInt((allEstimatePrice + curEstimatePrice) * 100) / 100;
        item.estimatePrice = curEstimatePrice;
      })
  }
  // 请求天天基金网获取净值
  function getRealPrice(item) {
    return new Promise((resolve, reject) => {
      superagent.get(`${realRateUrl}/${item.code}.html?spm=search`)
      .end((err, res) => {
        if (err) {
          console.log(`访问失败 - ${err}`)
          reject(err);
        } else {
          const htmlText = res.text;
          const $ = cheerio.load(htmlText);
          const dateText = $('.dataItem02 dt p').text();
          // 代表更新了净值
          if (dateText.includes(temp.date)) {
            item.realRate = $('.dataItem02 .dataNums .ui-font-middle').text().split('%')[0];
            const curRealPrice = parseInt((item.realRate / rate * item.basePrice) * 100) / 100;
            // 计算净值
            allRealPrice = parseInt((allRealPrice + curRealPrice) * 100) / 100;
            if (!item.isUpdate) {
              item.realPrice = curRealPrice;
              item.basePrice = parseInt((item.basePrice + curRealPrice) * 100) / 100;
              item.isUpdate = true;
            }
          }
          resolve(res.text);
        }
      })
    });
  }

  Promise.all(axiosList).then(() => {
    if (data.every(e => e.isUpdate)) {
      const writeData = { date, data, todayEarnings: allRealPrice };
      // 存储历史数据
      const historyDate = historyData.map(e => e.date);
      if (!historyDate.includes(date)) {
        historyData.push(writeData);
        fs.writeFileSync(historyPath, JSON.stringify(historyData));
      }
      fs.writeFileSync(dataTempPath, JSON.stringify(temp));

      data.forEach((item) => {
        console.log(`rate: ${item.realRate}, 净值：${item.realPrice}, ${item.name}, basePrice: ${item.basePrice}`);
      })
      console.log('-------------------- 收益 ---------------------------------------');
      console.log(`${moment().format('YYYY-MM-DD HH:mm:ss')}实际收益：${(allRealPrice)}元`);

      return;
    } else {
      const row = {
        data: data.map(e => ({
          code: e.code,
          estimateRate: e.estimateRate + '%',
          estimatePrice: e.estimatePrice,
          basePrice: e.basePrice,
          name: e.name,
        })),
        todayEstimateEarnings: allEstimatePrice
      }
      fs.writeFileSync(estimatePath, JSON.stringify(row));
    }

    data.forEach((item) => {
      console.log(`rate: ${item.estimateRate}, 估值：${item.estimatePrice}, ${item.name}, basePrice: ${item.basePrice}`);
    })

    console.log('-------------------- 收益 ---------------------------------------');
    console.log(`${moment().format('YYYY-MM-DD HH:mm:ss')}估值收益：${(allEstimatePrice)}元 `);
  });

};

exports.update = update;

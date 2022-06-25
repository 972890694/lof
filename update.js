const fs = require('fs');
const superagent = require("superagent");
const cheerio = require("cheerio");
const moment = require('moment');

const realRateUrl = 'http://fund.eastmoney.com';
const dataTempPath = `${__dirname}/dataTemp.json`;
const historyPath = `${__dirname}/history.json`;

const update = () => {
  return new Promise((resolve, reject) => {
    const todayDate = moment().format('YYYY-MM-DD');
    if ([6, 7].includes(moment().day())) {
      reject('周六周日不更新~');
      return;
    }
    const temp = JSON.parse(fs.readFileSync(dataTempPath));

    const historyData = JSON.parse(fs.readFileSync(historyPath));
    const historyDate = historyData.map(e => e.date);
    // 包含代表更新过了
    if (historyDate.includes(temp.date)) {
      reject('已经更新过上一次净值了，请明天再试~');
      return;
    }

    // 百分比
    const rate = 100;
    // 净值总收益
    let allRealPrice = 0;
    const data = temp.data.filter(e => e.isHold);

    let axiosList = [];
    // 循环天天基金发请求
    data.forEach((item) => {
      axiosList.push(getRealPrice(item));
    });
    // 请求天天基金网获取净值
    function getRealPrice(item) {
      return new Promise((resolve, reject) => {
        superagent.get(`${realRateUrl}/${item.code}.html?spm=search`)
          .end((err, res) => {
            if (err) {
              reject(err);
            } else {
              const htmlText = res.text;
              const $ = cheerio.load(htmlText);
              const dateText = $('.dataItem02 dt p').text();

              if (dateText.includes(temp.date)) {
                item.realRate = $('.dataItem02 .dataNums .ui-font-middle').text().split('%')[0] * 100 / 100;
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

    // 重置temp的 isupdate, 以及当天时间
    function resetTemp() {
      temp.date = temp.date === todayDate ? moment(todayDate).add({ days: 1 }).format('YYYY-MM-DD') : todayDate;
      temp.todayEarnings = 0;
      temp.data.forEach(item => {
        // 重置更新
        item.isUpdate = false;

        // 重置估值
        item.estimateRate = 0;
        item.estimatePrice = 0;

        // 重置净值
        item.realRate = 0;
        item.realPrice = 0;
      });
      return temp;
    }
    Promise.all(axiosList).then(() => {
      if (data.every(e => e.isUpdate)) {
        temp.todayEarnings = allRealPrice;
        historyData.push(temp);
        fs.writeFileSync(historyPath, JSON.stringify(historyData));

        data.forEach((item) => {
          console.log(`rate: ${item.realRate}, 净值：${item.realPrice}, ${item.name}, basePrice: ${item.basePrice}`);
        })
        console.log('-------------------- 收益 ---------------------------------------');
        console.log(`${temp.date}实际收益：${(temp.todayEarnings)}元`);

        fs.writeFileSync(dataTempPath, JSON.stringify(resetTemp()));
        resolve();
      } else {
        reject(`${temp.date} 净值还未更新`)
      }
    });
  })

};
exports.update = update;

const CsvService = require('./CsvService');
const logger = require('./logger');
const { DateTime } = require('luxon');
const _ = require('lodash');
const fs = require('fs');

const filePathList = [
  '2023-06-18.csv',
  '2023-06-20.csv',
  '2023-06-22.csv',
  '2023-06-23.csv',
  '2023-06-24.csv',
  '2023-06-25.csv',
  '2023-06-26.csv',
  '2023-06-27.csv',
  '2023-06-28.csv',
];
const dataMap = {};

const start = async () => {
  let firstDayInWeek = true;
  let weekdayCheckList = [];
  const theFirstDay = DateTime.fromISO(filePathList[0].split('.')[0]);
  const theLastDay = DateTime.fromISO(filePathList[filePathList.length - 1].split('.')[0]);
  const duration = theLastDay.diff(theFirstDay, ['days']).toObject().days;

  const titleList = ['成員'];
  for (let filePath of filePathList) {
    const dataList = await CsvService.readData(`./data/${filePath}`);
    const dateInLuxon = DateTime.fromISO(filePath.split('.')[0]);
    const magnification = (theLastDay.diff(dateInLuxon, ['days']).toObject().days + 1) / duration;
    titleList.push(`${dateInLuxon.toISODate()}_原始分數`);
    titleList.push(`${dateInLuxon.toISODate()}_日期加權分數`);
    const contributionList = [];

    weekdayCheckList.push(dateInLuxon);
    if (weekdayCheckList.length > 1) {
      if (
        weekdayCheckList[weekdayCheckList.length - 1].weekday <= weekdayCheckList[weekdayCheckList.length - 2].weekday
      ) {
        weekdayCheckList = [dateInLuxon];
      }
    }
    if (weekdayCheckList.length === 1) {
      firstDayInWeek = true;
    } else {
      firstDayInWeek = false;
    }
    for (let data of dataList) {
      const name = _.trim(data[0]);
      if (name === '成員') {
        continue;
      }
      if (!dataMap[name]) {
        dataMap[name] = {};
      }
      const previousWarExploitsInWeek =
        !firstDayInWeek && dataMap[name][weekdayCheckList[weekdayCheckList.length - 2].toISODate()]
          ? dataMap[name][weekdayCheckList[weekdayCheckList.length - 2].toISODate()].warExploitsInWeek
          : 0;
      const previousAssistInWeek =
        !firstDayInWeek && dataMap[name][weekdayCheckList[weekdayCheckList.length - 2].toISODate()]
          ? dataMap[name][weekdayCheckList[weekdayCheckList.length - 2].toISODate()].assistInWeek
          : 0;
      const warExploits = +data[2] - previousWarExploitsInWeek;
      const assist = +data[3] - previousAssistInWeek;
      const contribution = calculateContribution(warExploits, assist);

      dataMap[name][dateInLuxon.toISODate()] = {
        weekday: dateInLuxon.weekday,
        firstDayInWeek,
        warExploitsInWeek: +data[2] || 0,
        assistInWeek: +data[3] || 0,
        contribution,
      };
      contributionList.push([name, contribution]);
    }
    const rank = contributionList.sort((a, b) => b[1] - a[1]);

    rank.forEach((data, index) => {
      const name = data[0];
      if (dataMap[name][dateInLuxon.toISODate()]) {
        dataMap[name][dateInLuxon.toISODate()]['rank'] = index + 1;
        dataMap[name][dateInLuxon.toISODate()]['score'] = rank.length - index;
        dataMap[name][dateInLuxon.toISODate()]['dateScore'] = (rank.length - index) * magnification;
      }
    });
  }
  const csvList = [];
  titleList.push('總得分');

  for (let name in dataMap) {
    const csvData = [];
    let total = 0;
    for (let title of titleList) {
      if (title === '成員') {
        csvData.push(name);
      } else if (title === '總得分') {
        csvData.push(total);
      } else {
        const date = title.split('_')[0];
        const scoreCategory = title.split('_')[1];
        if (scoreCategory === '原始分數') {
          if (dataMap[name][date]) {
            csvData.push(dataMap[name][date]['score']);
          } else {
            csvData.push(0);
          }
        } else if (scoreCategory === '日期加權分數') {
          if (dataMap[name][date]) {
            csvData.push(dataMap[name][date]['dateScore']);
            total += dataMap[name][date]['dateScore'];
          } else {
            csvData.push(0);
          }
        }
      }
    }
    csvList.push(csvData);
  }
  csvList.sort((a, b) => b[titleList.length - 1] - a[titleList.length - 1]);
  csvList.forEach((data, index) => {
    csvList[index].push(index + 1);
  });
  titleList.push('總排名');

  csvList.unshift(titleList);
  const csv = CsvService.formatListToCsv(csvList);
  fs.writeFileSync('貢獻排名計算v1.csv', csv);
};

const calculateContribution = (warExploits, assist) => {
  const contribution = warExploits * 1 + assist * 5;
  return contribution;
};
start();

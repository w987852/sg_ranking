'use strict';
const _ = require('lodash');
const logger = require('./logger');
const fs = require('fs');
const csv = require('csv'); // http://csv.adaltas.com/
const jschardet = require('jschardet');

class CsvService {
  static readData(path, opt, parseOpt = {}) {
    // parseOpt 請參考 https://csv.js.org/parse/options/
    const defaultCast = value => {
      return value.replace(/^="|"$/g, '');
    };
    parseOpt.cast = parseOpt.cast || defaultCast;

    let data = fs.readFileSync(path);
    const encodingInfo = jschardet.detect(data);
    console.log('encodingInfo wsd1', encodingInfo);
    logger.info(`Parsing path:${path} with:`, { encodingInfo, parseOpt });

    return new Promise(function (resolve, reject) {
      csv.parse(data, parseOpt, function (err, data) {
        if (err) return reject(err);
        resolve(data);
      });
    });
  }

  /**
   * This is a promise wrapper for csv.parse()
   * @param {String}} data      String
   * @param {Object}  parseOpt  CSV parse options. Doc-ref: http://csv.adaltas.com/parse/
   */
  static parseFromString(data, parseOpt = {}) {
    return new Promise(function (resolve, reject) {
      csv.parse(data, parseOpt, function (err, data) {
        if (err) return reject(err);
        resolve(data);
      });
    });
  }

  static formatListToCsv(listData) {
    let str = '';
    _.forEach(listData, function (data) {
      if (!Array.isArray(data)) data = _.values(data);
      str +=
        data
          .map(function (field) {
            // 轉換每筆資料裡的欄位
            if (field === undefined) return '';
            return '"' + String(field).replace(/\"/g, '""') + '"'; // eslint-disable-line
          })
          .join(',') + '\r\n';
    });
    return str;
  }
}

module.exports = CsvService;

"use strict";
const util = require("util");
const { scrapeArticles } = require("./scrapeArticles");
const AWS = require("aws-sdk");
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const safePromisify = function (fun, methodsArray) {
  const suffix = "Async";
  methodsArray.forEach((method) => {
    fun[method + suffix] = util.promisify(fun[method]);
  });
};
safePromisify(dynamoDb, ["put"]);

const TABLE_NAME = process.env.DYNAMODB_TABLE;

const URLARR = [
  "https://kr-official.community/en-community/notice-en/",
  "https://kr-official.community/en-community/patchNote-en/",
  "https://kr-official.community/en-community/event-en/",
  "https://kr-official.community/en-community/specialShop-en/",
  "https://kr-official.community/en-community/gameContent-en/",
  "https://kr-official.community/en-community/guide/",
  "https://kr-official.community/en-community/kings-raid-media/",
];

const getLastItem = () => {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "master = :m",
    ExpressionAttributeValues: {
      ":m": "master",
    },
    ScanIndexForward: "false",
    Limit: 1,
  };
  return dynamoDb.query(params).promise();
};

const putItems = async (params) => {
  console.log("Put Item");
  await dynamoDb.putAsync(params);
  console.log("End Put Item");
};

module.exports.scrapeTemp = async (event) => {
  console.log("Start scraping");
  const resArr = [];
  await Promise.all(
    URLARR.map((url) =>
      scrapeArticles(url).then((articles) => resArr.push(...articles))
    )
  )
    .then(() => {
      console.log("Scan for last Item");
      return getLastItem().then(({ Items }) => {
        const sortResArr = resArr.sort(
          (a, b) => new Date(a.time) - new Date(b.time)
        );
        let newItems;
        if (Items.length >= 1) {
          const urls = sortResArr.map((v) => v.url);
          const indexItem = urls.indexOf(Items[0].url);
          newItems = sortResArr.slice(indexItem + 1);
        } else {
          newItems = sortResArr;
        }
        return newItems;
      });
    })
    .then(async (items) => {
      if (items.length > 0) {
        console.log(`Found ${items.length} new Items`);
        let prevTime;
        const promEach = new Promise((resolve, reject) => {
          items.forEach(async (data, index) => {
            if (prevTime === data.time) {
              data.time += 1;
            }
            prevTime = data.time;
            const params = {
              TableName: TABLE_NAME,
              Item: data,
            };
            await putItems(params);
            if (items.length === index + 1) resolve();
          });
          // End forEach
        });
        promEach.then(() => {
          console.log("End Scraping");
          return {
            statusCode: 200,
            body: JSON.stringify({
              message: "Success!",
            }),
          };
        });
      } else {
        console.log("No new Items found!");
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "No new Items found!",
          }),
        };
      }
    });
};

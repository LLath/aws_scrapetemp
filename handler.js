"use strict";
const { scrapeArticles } = require("./scrapeArticles");
const AWS = require("aws-sdk");
const dynamoDb = new AWS.DynamoDB.DocumentClient();

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
        let inFunction = true;
        const sortResArr = resArr.sort(
          (a, b) => new Date(a.time) - new Date(b.time)
        );
        let newItems = sortResArr;
        if (Items.length >= 1) {
          const times = sortResArr.map((v) => v.time);
          const indexItem = times.indexOf(Items[0].time);
          newItems = sortResArr.slice(indexItem + 1);
        }
        if (newItems.length > 0) {
          console.log("Found new Item");
          let prevTime;
          newItems.forEach((data, index) => {
            if (prevTime === data.time) {
              data.time += 1;
            }
            prevTime = data.time;

            const params = {
              TableName: TABLE_NAME,
              Item: data,
            };
            dynamoDb.put(params, (err, data) => {
              console.log("Put Item");
              if (err) console.error(err);
              else console.log("End Putting");
            });
            if (index === newItems.length) inFunction = false;
          });
          // End forEach
        } else console.log("No new Items found");
        return inFunction;
      });
    })
    .then((v) => {
      if (!v) {
        console.log("End Scraping");
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "Success!",
          }),
        };
      }
    });
};

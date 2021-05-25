const fetch = require("node-fetch");
const Entities = require("html-entities").AllHtmlEntities;
const { load } = require("cheerio");

const entities = new Entities();

const regexURL = /(?<=href=")(https:\/\/.*?)(?=")/;
const regexTime = /(?<=datetime=").*?(?=")/;

const scrapeArticles = (URL) => {
  console.log("Scan Article", URL);
  return new Promise((resolve, reject) =>
    fetch(URL)
      .then((res) => res.text())
      .then((text) => {
        const list = [];
        const $ = load(text);
        $(".wp-block-latest-posts__list")
          .find("li")
          .each((index, post) => {
            list.push({
              title: entities.decode($(post).find("a").text()),
              url: decodeURI($(post).find("a").attr("href")),
              description: "",
              time: $(post).find("time").attr("datetime"),
              type: URL.split("/")[URL.split("/").length - 2].replace(
                "-en",
                ""
              ),
              master: "master",
            });
          });
        resolve(list);
      })
  );
};

const URLARR = [
  "https://kr-official.community/en-community/notice-en/",
  "https://kr-official.community/en-community/patchNote-en/",
  "https://kr-official.community/en-community/event-en/",
  "https://kr-official.community/en-community/specialShop-en/",
  "https://kr-official.community/en-community/gameContent-en/",
  "https://kr-official.community/en-community/guide/",
  "https://kr-official.community/en-community/kings-raid-media/",
];

// scrapeArticles(URLARR[1]).then((v) => console.log(v));

// URLARR.map((a) => {
//   console.log(a);
//   scrapeArticles(a).then(() => console.log("Fertig"));
// });

module.exports = { scrapeArticles };

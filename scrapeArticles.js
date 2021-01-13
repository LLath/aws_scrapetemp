const fetch = require("node-fetch");
const { parse } = require("node-html-parser");
const Entities = require("html-entities").AllHtmlEntities;

const entities = new Entities();

const regexURL = /(?<=href=")(https:\/\/.*?)(?=")/;
const regexTime = /(?<=datetime=").*?(?=")/;

const scrapeArticles = (URL) => {
  return new Promise((resolve, reject) =>
    fetch(URL)
      .then((res) => res.text())
      .then((text) => parse(text))
      .then((_html) =>
        _html.querySelector(".page-content")
          ? _html.querySelector(".page-content")
          : _html
      )
      .then((content) => {
        const articles = content.querySelectorAll("article");
        const result = articles.map((article) => ({
          title: entities.decode(article.querySelector(".entry-title").rawText),
          url: decodeURI(
            article
              .querySelector(".entry-title")
              .querySelector("a")
              .rawAttrs.match(regexURL)[0]
          ),
          description: article.querySelector("p")
            ? entities.decode(article.querySelector("p").structuredText)
            : "",
          time: article
            .querySelector(".entry-meta")
            .querySelector("time")
            .rawAttrs.match(regexTime)[0],
          type: URL.split("/")[URL.split("/").length - 2].replace("-en", ""),
          master: "master",
        }));
        resolve(result);
      })
  ).catch((error) => console.error(error));
};

module.exports = { scrapeArticles };

'use strict';

const axios = require('axios');
const xml2js = require('xml2js');
const cheerio = require('cheerio');

module.exports = function (libs, settings) {
    const parser = new xml2js.Parser();

    const RSS_URL = 'https://toloka.to/rss.php?t=1&lite=1&cat=8&toronly=1&thumbs=1';

    function getToloka() {
        return axios.get(RSS_URL)
            .then(response => parser.parseStringPromise(response.data))
            .then(result => {
                const items = result.rss.channel[0].item;
                return items.map(item => ({
                    title: item.title[0],
                    link: item.link[0],
                    description: item.description ? item.description[0] : '',
                }));
            });
    }

    async function getMagnet(link) {
        try {
            const response = await axios.get(link);
            const $ = cheerio.load(response.data);
            const magnet = $('a[href^="magnet:"]').attr('href');
            return magnet || '';
        } catch (e) {
            return '';
        }
    }

    return {
        search: async function (query) {
            const items = await getToloka();
            const filtered = items.filter(i => i.title.toLowerCase().includes(query.toLowerCase()));
            const results = [];
            for (const item of filtered) {
                const magnet = await getMagnet(item.link);
                results.push({
                    title: item.title,
                    description: item.description,
                    url: item.link,
                    magnet: magnet,
                    type: 'torrent'
                });
            }
            return results;
        },

        catalog: async function () {
            const items = await getToloka();
            const results = [];
            for (const item of items) {
                const magnet = await getMagnet(item.link);
                results.push({
                    title: item.title,
                    description: item.description,
                    url: item.link,
                    magnet: magnet,
                    type: 'torrent'
                });
            }
            return results;
        },

        // Додає окремий розділ у головне меню
        menu: async function () {
            return [
                {
                    title: 'Toloka',
                    url: 'toloka:catalog',
                    component: 'catalog',
                    filter: false
                }
            ];
        }
    };
};

const { name } = require('./app.json');

module.exports = {
    name: name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    version: "1.0.0",
    orientation: "portrait",
    platforms: ["ios", "android", "web"],
    entryPoint: "./index.js",
    web: {
        bundler: "webpack",
        favicon: "./assets/favicon.png"
    }
}; 
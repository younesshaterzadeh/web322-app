const fs = require('fs');

let items = [];
let categories = [];

module.exports.initialize = () => {
    return new Promise((resolve, reject) => {
        fs.readFile('./data/items.json', 'utf8', (err, data) => {
            if (err) {
                reject('Unable to read items file');
                return;
            }
            items = JSON.parse(data);

            fs.readFile('./data/categories.json', 'utf8', (err, data) => {
                if (err) {
                    reject('Unable to read categories file');
                    return;
                }
                categories = JSON.parse(data);
                resolve();
            });
        });
    });
};

module.exports.addItem = (itemData) => {
    return new Promise((resolve, reject) => {
        itemData.published = !!itemData.published;
        itemData.id = items.length + 1;
        itemData.postDate = new Date().toISOString().split('T')[0];
        items.push(itemData);
        resolve(itemData);
    });
};

module.exports.getAllItems = () => {
    return new Promise((resolve, reject) => {
        if (items.length > 0) {
            resolve(items);
        } else {
            reject('No items found');
        }
    });
};

module.exports.getCategories = () => {
    return new Promise((resolve, reject) => {
        if (categories.length > 0) {
            resolve(categories);
        } else {
            reject('No categories found');
        }
    });
};

module.exports.getPublishedItemsByCategory = (category) => {
    return new Promise((resolve, reject) => {
        const filteredItems = items.filter(item => item.published && (!category || item.category == category));
        if (filteredItems.length > 0) {
            resolve(filteredItems);
        } else {
            reject('No items found');
        }
    });
};

module.exports.getItemById = (id) => {
    return new Promise((resolve, reject) => {
        const item = items.find(item => item.id == id);
        if (item) {
            resolve(item);
        } else {
            reject('No item found');
        }
    });
};

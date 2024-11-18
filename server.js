/*********************************************************************************
*  WEB322 – Assignment 4
*  I declare that this assignment is my own work in accordance with Seneca Academic Policy.
*  No part of this assignment has been copied manually or electronically from any other source.
*
*  Name: Younes Shaterzadeh
*  Student ID: 187484233
*  Date: 11/18/2024
*  Cyclic Web App URL: <Your Cyclic App URL>
*  GitHub Repository URL: https://github.com/younesshaterzadeh/web322-app
********************************************************************************/


const express = require('express');
const exphbs = require('express-handlebars');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const storeService = require('./store-service');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Cloudinary configuration
cloudinary.config({
    cloud_name: 'Your Cloud Name',
    api_key: 'Your API Key',
    api_secret: 'Your API Secret',
    secure: true
});

const upload = multer(); // No disk storage

// Handlebars setup
app.engine('.hbs', exphbs.engine({
    extname: '.hbs',
    helpers: {
        navLink: function (url, options) {
            return '<li class="nav-item"><a class="nav-link ' +
                ((url === app.locals.activeRoute) ? 'active' : '') +
                '" href="' + url + '">' + options.fn(this) + '</a></li>';
        },
        equal: function (lvalue, rvalue, options) {
            if (lvalue != rvalue) {
                return options.inverse(this);
            } else {
                return options.fn(this);
            }
        }
    }
}));
app.set('view engine', '.hbs');

// Middleware for active route
app.use((req, res, next) => {
    let route = req.path.substring(1);
    app.locals.activeRoute = "/" + (isNaN(route.split('/')[1]) ? route.replace(/\/(?!.*)/, "") : route.replace(/\/(.*)/, ""));
    app.locals.viewingCategory = req.query.category;
    next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => res.redirect('/shop'));

app.get('/about', (req, res) => res.render('about'));

app.get('/items/add', (req, res) => res.render('addItem'));

app.post('/items/add', upload.single('featureImage'), (req, res) => {
    if (req.file) {
        let streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                let stream = cloudinary.uploader.upload_stream(
                    (error, result) => {
                        if (result) {
                            resolve(result);
                        } else {
                            reject(error);
                        }
                    }
                );
                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };

        async function upload(req) {
            let result = await streamUpload(req);
            return result;
        }

        upload(req).then((uploaded) => {
            processItem(uploaded.url);
        });
    } else {
        processItem("");
    }

    function processItem(imageUrl) {
        req.body.featureImage = imageUrl;
        storeService.addItem(req.body)
            .then(() => res.redirect('/items'))
            .catch(err => res.status(500).send("Unable to add item"));
    }
});

app.get('/items', (req, res) => {
    storeService.getAllItems()
        .then(items => res.render('items', { items: items }))
        .catch(err => res.render('items', { message: 'No results' }));
});

app.get('/categories', (req, res) => {
    storeService.getCategories()
        .then(categories => res.render('categories', { categories: categories }))
        .catch(err => res.render('categories', { message: 'No results' }));
});

app.get('/shop', (req, res) => {
    storeService.getPublishedItemsByCategory(req.query.category || null)
        .then(data => res.render('shop', { data: data }))
        .catch(err => res.render('shop', { message: 'No results' }));
});

app.get('/shop/:id', (req, res) => {
    storeService.getItemById(req.params.id)
        .then(data => res.render('shop', { data: data }))
        .catch(err => res.render('shop', { message: 'No results' }));
});

// 404 Route
app.use((req, res) => res.status(404).render('404'));

// Initialize and start server
storeService.initialize()
    .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
    .catch(err => console.error(`Unable to start server: ${err}`));

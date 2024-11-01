/*********************************************************************************
* WEB322 – Assignment 03
* I declare that this assignment is my own work in accordance with Seneca Academic Policy. No part
* of this assignment has been copied manually or electronically from any other source
* (including 3rd party web sites) or distributed to other students.
*
* Name: Younes Shaterzadeh Student ID: 187484233 Date: 11/1/2024
*
* Cyclic Web App URL: ________________________________________________________
*
* GitHub Repository URL: https://github.com/younesshaterzadeh/web322-app
*
********************************************************************************/

const express = require('express');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const storeService = require('./store-service');

const app = express();
const PORT = process.env.PORT || 8080;

// Cloudinary configuration
cloudinary.config({
    cloud_name: 'dlymksw9u',
    api_key: '289174169556625',
    api_secret: 'DgUHzAqM-0p6sSMidzT2tdWj_io',
    secure: true
});

const upload = multer(); // No disk storage

// Serve static files
app.use(express.static('public'));

// Middleware to parse URL-encoded data
app.use(express.urlencoded({ extended: true }));

// Route for About page
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'about.html'));
});

// Route for Add Item page
app.get('/items/add', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'addItem.html'));
});

// Route to handle POST request to add new item
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
            .then(() => {
                res.redirect('/items');
            })
            .catch(err => {
                res.status(500).send("Unable to add item");
            });
    }
});

// Route for fetching items (with optional filters)
app.get('/items', (req, res) => {
    if (req.query.category) {
        storeService.getItemsByCategory(req.query.category)
            .then((items) => res.json(items))
            .catch((err) => res.json({ message: err }));
    } else if (req.query.minDate) {
        storeService.getItemsByMinDate(req.query.minDate)
            .then((items) => res.json(items))
            .catch((err) => res.json({ message: err }));
    } else {
        storeService.getAllItems()
            .then((items) => res.json(items))
            .catch((err) => res.json({ message: err }));
    }
});

// Route for fetching an item by ID
app.get('/item/:id', (req, res) => {
    storeService.getItemById(req.params.id)
        .then((item) => res.json(item))
        .catch((err) => res.json({ message: err }));
});

// Start the server
storeService.initialize()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Express http server listening on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error("Unable to start server:", err);
    });

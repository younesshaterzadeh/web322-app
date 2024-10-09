const express = require('express');
const path = require('path');
const storeService = require('./store-service');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static('public'));

// Redirect "/" to "/about"
app.get('/', (req, res) => {
    res.redirect('/about');
});

// Serve the about page
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'about.html'));
});

// Fetch published items
app.get('/shop', (req, res) => {
    storeService.getPublishedItems()
        .then(items => res.json(items, null, 4))
        .catch(err => res.json({ message: err }));
});

// Fetch all items
app.get('/items', (req, res) => {
    storeService.getAllItems()
        .then(items => res.json(items, null, 4))
        .catch(err => res.json({ message: err }));
});

// Fetch all categories
app.get('/categories', (req, res) => {
    storeService.getCategories()
        .then(categories => res.json(categories, null, 4))
        .catch(err => res.json({ message: err }));
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).send("Page Not Found");
});

// Initialize store service and start the server
storeService.initialize()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Express http server listening on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error("Unable to start server:", err);
    });

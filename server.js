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
const path = require('path');
const storeService = require('./store-service');
const session = require('express-session');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const dotenv = require('dotenv');
const exphbs = require('express-handlebars');

// Enable prototype property access
const { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access');
const handlebars = require('handlebars');



const app = express();
const PORT = process.env.PORT || 8080;

// Handlebars setup

app.engine(
    '.hbs',
    exphbs.engine({
        extname: '.hbs',
        defaultLayout: 'main',
        helpers: {
            navLink: function (url, options) {
                return (
                    '<li class="nav-item">' +
                    '<a class="nav-link ' +
                    (url === app.locals.activeRoute ? 'active' : '') +
                    '" href="' +
                    url +
                    '">' +
                    options.fn(this) +
                    '</a></li>'
                );
            },
            formatDate: function (dateObj) {
                let year = dateObj.getFullYear();
                let month = (dateObj.getMonth() + 1).toString();
                let day = dateObj.getDate().toString();
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            },
        },
        handlebars: allowInsecurePrototypeAccess(handlebars), // Enable access
    })
);
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));


require('dotenv').config();



// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

app.use((req, res, next) => {
    const route = req.path.split('/')[1] || '';
    app.locals.activeRoute = `/${route}`;
    next();
});


app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: process.env.SESSION_SECRET || 'defaultSecret',
        resave: false,
        saveUninitialized: true,
    })
);

// Initialize the cart if it doesn't exist
app.use((req, res, next) => {
    if (!req.session.cart) {
        req.session.cart = [];
    }
    next();
});

// Debugging Middleware (Optional)
app.use((req, res, next) => {
    console.log('Session Cart:', req.session.cart);
    next();
});

// Configure Multer
const upload = multer();


//Routes
app.get('/', (req, res) => {
    res.redirect('/shop');
});


app.get('/about', (req, res) => {
    res.render('about', { title: 'About Us' });
});

app.get('/shop', (req, res) => {
    const category = req.query.category || null;

    let viewData = {
        post: null,
        posts: [],
        categories: [],
        message: null,
        categoriesMessage: null
    };

    storeService.getPublishedItems()
        .then((posts) => {
            viewData.posts = posts;
            if (category) {
                return storeService.getPublishedItemsByCategory(category);
            } else {
                return Promise.resolve([]);
            }
        })
        .then((filteredPosts) => {
            if (filteredPosts.length > 0) {
                viewData.post = filteredPosts[0];
            }
            return storeService.getCategories();
        })
        .then((categories) => {
            viewData.categories = categories;
        })
        .catch((err) => {
            viewData.message = err;
        })
        .finally(() => {
            res.render('shop', viewData);
        });

        console.log("Fetched posts:", viewData.posts);
console.log("Selected post:", viewData.post);
console.log("Categories:", viewData.categories);

});



app.get('/shop/:id', (req, res) => {
    const itemId = req.params.id;

    let viewData = {
        post: null,
        posts: [],
        categories: [],
        message: null,
        categoriesMessage: null
    };

    storeService.getPublishedItems()
        .then((posts) => {
            viewData.posts = posts;
            return storeService.getCategories();
        })
        .then((categories) => {
            viewData.categories = categories;
            return storeService.getAllItems();
        })
        .then((allItems) => {
            const item = allItems.find((item) => item.id == itemId);
            if (item) {
                viewData.post = item;
            } else {
                viewData.message = "Item not found.";
            }
        })
        .catch((err) => {
            viewData.message = "Error loading the requested item.";
        })
        .finally(() => {
            res.render('shop', viewData);
        });
});


app.get('/items', (req, res) => {
    storeService.getAllItems()
        .then((items) => {
            if (items.length > 0) {
                res.render('items', { title: 'Items', items });
            } else {
                res.render('items', { title: 'Items', message: 'No results' });
            }
        })
        .catch(() => {
            res.render('items', { title: 'Items', message: 'Error retrieving items' });
        });
});

// Route to delete an item by ID
app.get('/items/delete/:id', (req, res) => {
    storeService.deleteItemById(req.params.id)
        .then(() => res.redirect('/items'))
        .catch((err) => {
            console.error(err);
            res.status(500).send("Unable to Remove Item / Item not found");
        });
});



app.get('/categories', (req, res) => {
    storeService.getCategories()
        .then((categories) => {
            if (categories.length > 0) {
                res.render('categories', { title: 'Categories', categories });
            } else {
                res.render('categories', { title: 'Categories', message: 'No results' });
            }
        })
        .catch(() => {
            res.render('categories', { title: 'Categories', message: 'Error retrieving categories' });
        });
});
// Route to render the addCategory view

app.get('/categories/add', (req, res) => {
    res.render('addCategory', { title: 'Add Category' });
});

// Route to handle adding a new category
app.post('/categories/add', (req, res) => {
    storeService.addCategory(req.body)
        .then(() => res.redirect('/categories'))
        .catch((err) => {
            console.error(err);
            res.status(500).send("Unable to add category");
        });
});


app.get('/items/add', (req, res) => {
    storeService.getCategories()
        .then((categories) => {
            res.render('addPost', { title: 'Add Items', categories });
        })
        .catch(() => {
            res.render('addPost', { title: 'Add Items', categories: [] });
        });
});

app.post('/items/add', upload.single('featureImage'), (req, res) => {
    const processItem = (imageUrl) => {
        req.body.featureImage = imageUrl;
        storeService
            .addItem(req.body)
            .then(() => {
                res.redirect('/items');
            })
            .catch((err) => {
                res.status(500).json({ message: 'Failed to add item', error: err });
            });
    };

    if (req.file) {
        const streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                let stream = cloudinary.uploader.upload_stream((error, result) => {
                    if (result) {
                        resolve(result);
                    } else {
                        reject(error);
                    }
                });
                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };

        streamUpload(req)
            .then((uploaded) => {
                processItem(uploaded.url);
            })
            .catch(() => {
                res.status(500).json({ message: 'Image upload failed' });
            });
    } else {
        processItem('');
    }
});

app.get('/cart', (req, res) => {
    const cartItems = req.session.cart || [];
    const total = cartItems.reduce((sum, item) => sum + item.price, 0);
    res.render('cart', { title: 'Your Cart', cartItems, total });
});

// Route for Adding Items to Cart
app.post('/cart/add', (req, res) => {
    if (!req.session.cart) req.session.cart = [];
    const { itemId, itemName, itemPrice } = req.body;

    const item = {
        id: parseInt(itemId, 10),
        name: itemName,
        price: parseFloat(itemPrice),
    };

    req.session.cart.push(item);
    res.redirect('/cart'); // Redirect to the cart page after adding an item
});


// Route for Checkout
app.post('/cart/checkout', (req, res) => {
    res.render('checkout', { message: 'Thank you for your purchase!' });
});

app.get('/cart', (req, res) => {
    const cartItems = req.session.cart || [];
    const total = cartItems.reduce((sum, item) => sum + item.price, 0);
    res.render('cart', { cartItems, total });
});

app.get('/categories', (req, res) => {
    storeService.getCategories()
        .then((categories) => {
            if (categories.length > 0) {
                res.render('categories', { title: 'Categories', categories });
            } else {
                res.render('categories', { title: 'Categories', message: 'No results' });
            }
        })
        .catch(() => {
            res.render('categories', { title: 'Categories', message: 'Error retrieving categories' });
        });
});



app.get('/category/:id', (req, res) => {
    const categoryId = parseInt(req.params.id, 10);

    storeService.getAllItems().then((items) => {
        const filteredItems = items.filter(item => item.category === categoryId);
        res.render('categoryProducts', { items: filteredItems });
    }).catch((err) => {
        res.status(500).json({ message: 'Failed to load category products', error: err });
    });
});

app.get('/categories/delete/:id', (req, res) => {
    storeService.deleteCategoryById(req.params.id)
        .then(() => res.redirect('/categories'))
        .catch((err) => {
            console.error(err);
            res.status(500).send("Unable to Remove Category / Category not found");
        });
});




app.use((req, res) => {
    res.status(404).render('404', { message: 'Page Not Found' });
});

storeService.initialize()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is listening on port ${PORT}`);
        });
    })
    .catch(err => console.log(err));
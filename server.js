/***************************
WEB322 – Assignment 6
I declare that this assignment is my own work in accordance with Seneca 
Academic Policy. No part of this assignment has been copied manually or 
electronically from any other source (including 3rd party web sites) or 
distributed to other students.

Name: Younes Shaterzadeh
Student ID: 187484233
Date: 2024-12-11
Replit Web App URL: https://replit.com/@yshaterzadeh/web322-app
GitHub Repository URL: https://github.com/younesshaterzadeh/web322-app
****************************/

const express = require('express');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const storeService = require('./store-service');
const Handlebars = require('handlebars');
const methodOverride = require('method-override');
const authData = require("./auth-service");
const clientSessions = require("client-sessions");
const HTTP_PORT = process.env.PORT || 8080;

const app = express();
const upload = multer();
const exphbs = require('express-handlebars');

app.engine('.hbs', exphbs.engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true,
  },
  helpers: {
    navLink: function(url, options) {
      return `<li class="nav-item${url === options.data.root.activeRoute ? ' active' : ''}">
                  <a class="nav-link" href="${url}">${options.fn(this)}</a>
              </li>`;
    },
    equal: function(lvalue, rvalue, options) {
      if (arguments.length < 3) {
        throw new Error("Handlebars Helper equal needs 2 parameters");
      }
      return lvalue != rvalue ? options.inverse(this) : options.fn(this);
    },
    safeHTML: function(context) {
      return context ? new Handlebars.SafeString(context) : "";
    },
    formatDate: function(dateObj) {
      let year = dateObj.getFullYear();
      let month = (dateObj.getMonth() + 1).toString();
      let day = dateObj.getDate().toString();
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2,'0')}`;
    }
  }
}));

app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(
  clientSessions({
    cookieName: "session",
    secret: "mySession",
    duration: 24 * 60 * 60 * 1000, 
    activeDuration: 30 * 60 * 1000, 
  })
);

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect("/login");
  } else {
    next();
  }
}

cloudinary.config({
  cloud_name: 'dlymksw9u',
  api_key: '289174169556625',
  api_secret: 'DgUHzAqM-0p6sSMidzT2tdWj_io',
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

function ensureLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    res.redirect("/login");
  } else {
    next();
  }
}

app.use(function(req, res, next) {
  res.locals.activeRoute = req.baseUrl + req.path;
  next();
});

app.get('/', (req, res) => {
  res.redirect('/shop');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/about', (req, res) => {
  res.render('about');
});

app.get('/items/add', (req, res) => {
  storeService.getCategories()
    .then(data => {
      res.render('addPost', { categories: data });
    })
    .catch(() => {
      res.render('addPost', { categories: [] });
    });
});

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
      req.body.featureImage = uploaded.url;
      storeService.addItem(req.body)
        .then(() => res.redirect("/items"))
        .catch((err) => {
          res.status(500).render("addPost", {
            errorMessage: err,
            item: req.body
          });
        });
    });
  } else {
    req.body.featureImage = "";
    storeService.addItem(req.body)
      .then(() => res.redirect("/items"))
      .catch((err) => {
        res.status(500).render("addPost", {
          errorMessage: err,
          item: req.body
        });
      });
  }
});

app.get('/items', (req, res) => {
  storeService.getAllItems()
    .then(data => {
      if (data.length > 0) {
        res.render('items', { items: data });
      } else {
        res.render('items', { message: "No items available.", items: [] });
      }
    })
    .catch(err => {
      res.render('items', { message: err, items: [] });
    });
});

app.get('/shop', async (req, res) => {
  try {
      const items = await storeService.getAllItems();
      const categories = await storeService.getCategories();
      console.log('Items:', items);
      console.log('Categories:', categories);
      res.render('shop', { data: { posts: items, categories: categories } });
  } catch (error) {
      console.error('Error fetching shop data:', error.message);
      res.render('shop', { data: { posts: [], categories: [] }, message: "No results found" });
  }
});

app.get('/shop/:id', async (req, res) => {
  let viewData = {};
  try {
    const items = await storeService.getAllItems();
    viewData.posts = items;
    viewData.post = await storeService.getItemById(req.params.id);
  } catch (err) {
    viewData.message = "No results";
  }
  try {
    const categories = await storeService.getCategories();
    viewData.categories = categories;
  } catch (err) {
    viewData.categoriesMessage = "No categories available";
  }
  res.render('shop', { data: viewData });
});

app.get('/categories', (req, res) => {
  storeService.getCategories()
      .then((data) => {
          console.log(data);
          if (data.length > 0) {
              res.render('categories', { categories: data });
          } else {
              res.render('categories', { message: "No results" });
          }
      })
      .catch((err) => {
          res.render('categories', { message: "No results" });
      });
});

app.get('/categories/add', (req, res) => {
  res.render('addCategory');
});

app.post('/categories/add', (req, res) => {
  storeService.addCategory(req.body)
    .then(() => {
      res.redirect('/categories');
    })
    .catch((err) => {
      res.status(500).render('addCategory', {
        errorMessage: err,
        category: req.body.category
      });
    });
});

app.get('/categories/delete/:id', (req, res) => {
  storeService.deleteCategoryById(req.params.id)
      .then(() => {
          res.redirect('/categories');
      })
      .catch((err) => {
          res.status(500).render('categories', {
              message: "Unable to Remove Category / Category not found"
          });
      });
});

app.get('/items/delete/:id', (req, res) => {
  storeService.deleteItemById(req.params.id)
    .then(() => {
      res.redirect('/items');
    })
    .catch((err) => {
      res.status(500).send("Unable to Remove Post / Post not found");
    });
});

app.get("/login", (req, res) => {
  try {
    res.render("login");
  } catch (err) {
    console.error("Error rendering login page:", err);
    res.status(500).send("Server error");
  }
});

app.get("/register", (req, res) => {
  try {
    res.render("register");
  } catch (err) {
    console.error("Error rendering register page:", err);
    res.status(500).send("Server error");
  }
});

app.post("/register", async (req, res) => {
  console.log("Request body:", req.body);

  if (!req.body || !req.body.userName || !req.body.password) {
    return res.status(400).render("register", { 
      errorMessage: "Both userName and password are required", 
      userName: req.body ? req.body.userName : '' 
    });
  }

  const { userName, password } = req.body;

  try {
    await authData.registerUser(req.body);
    res.render("register", { successMessage: "User created", userName });
  } catch (err) {
    console.error("Registration error:", err);
    res.render("register", { 
      errorMessage: err.message || 'An error occurred', 
      userName 
    });
  }
});

app.use((req, res, next) => {
  console.log("Session Debug - req.session:", req.session);
  next();
});

app.post("/login", async (req, res) => {
  req.body.userAgent = req.get("User-Agent");

  console.log("Session before login:", req.session);

  if (!req.session) {
    console.error("Session not initialized");
    return res.status(500).render("login", {
      errorMessage: "Session not initialized. Please refresh and try again.",
    });
  }

  try {
    const user = await authData.checkUser(req.body);
    req.session.user = {
      userName: user.userName,
      email: user.email,
      loginHistory: user.loginHistory,
    };

    res.redirect("/items");
  } catch (err) {
    console.error("Login error:", err);
    res.render("login", { errorMessage: err.message || "An error occurred." });
  }
});

app.get("/logout", (req, res) => {
  req.session.reset(); 
  res.redirect("/");
});

app.get("/userHistory", ensureLogin, (req, res) => {
  res.render("userHistory");
});

app.use((req, res) => {
  res.status(404).render("404");
});

storeService
  .initialize()
  .then(authData.initialize)
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log(`Server is running on port ${HTTP_PORT}`);
    });
  })
  .catch((err) => {
    console.error("Unable to start server:", err);
  });

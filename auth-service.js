const bcrypt = require('bcryptjs');
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  userName: { type: String, unique: true },
  password: String,
  email: String,
  loginHistory: [
    {
      dateTime: Date,
      userAgent: String,
    },
  ],
});

let User;

module.exports.initialize = function () {
  return new Promise((resolve, reject) => {
    const db = mongoose.createConnection("mongodb+srv://yshaterzadeh:mm11223311mm@cluster0.rnjzz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

    db.on("error", (err) => {
      console.error("Database connection error:", err);
      reject(err);
    });

    db.once("open", () => {
      console.log("Database connection successful");
      User = db.model("users", userSchema);
      resolve();
    });
  });
};

module.exports.registerUser = function (userData) {
  return new Promise(function (resolve, reject) {
    if (!userData.password || !userData.password2) {
      return reject("Passwords are required");
    }

    if (userData.password !== userData.password2) {
      return reject("Passwords do not match");
    }

    console.log("Password before hashing:", userData.password); 

    bcrypt
      .hash(userData.password, 10)
      .then((hash) => {
        console.log("Password hashed successfully:", hash);
        userData.password = hash;

        let newUser = new User(userData);
        newUser
          .save()
          .then(() => resolve())
          .catch((err) => {
            if (err.code === 11000) {
              reject("User Name already taken");
            } else {
              reject(`There was an error creating the user: ${err}`);
            }
          });
      })
      .catch((err) => {
        console.error("Error encrypting password:", err); 
        reject("There was an error encrypting the password");
      });
  });
};

module.exports.checkUser = function (userData) {
  return new Promise((resolve, reject) => {
    User.find({ userName: userData.userName })
      .then((users) => {
        if (users.length === 0) {
          return reject(`Unable to find user: ${userData.userName}`);
        }

        const user = users[0];
        bcrypt
          .compare(userData.password, user.password)
          .then((result) => {
            if (!result) {
              return reject(`Incorrect Password for user: ${userData.userName}`);
            }

            user.loginHistory.push({
              dateTime: new Date().toString(),
              userAgent: userData.userAgent,
            });

            user
              .save()
              .then(() => {
                console.log("Authenticated user:", user); 
                resolve(user);
              })
              .catch((err) =>
                reject(`There was an error verifying the user: ${err}`)
              );
          })
          .catch((err) =>
            reject(`There was an error comparing passwords: ${err}`)
          );
      })
      .catch((err) => reject(`Unable to find user: ${userData.userName}`));
  });
};

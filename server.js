const fs = require('fs');
const express = require('express');
const exphbs = require('express-handlebars');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const app = express();

// To support URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// To parse cookies from the HTTP Request
app.use(cookieParser());

app.engine('hbs', exphbs({
    extname: '.hbs'
}));

app.set('view engine', 'hbs');

// Our requests hadlers will be implemented here...
app.get('/', function (req, res) {
    res.render('home');
});

app.get('/register', (req, res) => {
    res.render('register');
});

const crypto = require('crypto');

const getHashedPassword = (password) => {
    const sha256 = crypto.createHash('sha256');
    const hash = sha256.update(password).digest('base64');
    return hash;
}

const users = JSON.parse(fs.readFileSync('./database/users.json'));

app.post('/register', (req, res) => {
    const { email, firstName, lastName, password, confirmPassword } = req.body;

    // Check if the password and confirm password fields match
    if (password === confirmPassword) {

        // Check if user with the same email is also registered
        if (users.find(user => user.email === email)) {

            res.render('register', {
                message: 'User already registered.',
                messageClass: 'alert-danger'
            });

            return;
        }

        const hashedPassword = getHashedPassword(password);

        // Store user into the database if you are using one
        users.push({
            firstName,
            lastName,
            email,
            password: hashedPassword
        });

        res.render('login', {
            message: 'Registration Complete. Please login to continue.',
            messageClass: 'alert-success'
        });
    } else {
        res.render('register', {
            message: 'Password does not match.',
            messageClass: 'alert-danger'
        });
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

const generateAuthToken = () => {
    return crypto.randomBytes(30).toString('hex');
}

const authTokens = {};

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = getHashedPassword(password);

    const user = users.find(u => {
        return u.email === email && hashedPassword === u.password
    });

    if (user) {
        const authToken = generateAuthToken();

        // Store authentication token
        authTokens[authToken] = user;

        // Setting the auth token in cookies
        res.cookie('AuthToken', authToken);

        // Redirect user to the protected page
        res.redirect('/dasboard');
    } else {
        res.render('login', {
            message: 'Invalid username or password',
            messageClass: 'alert-danger'
        });
    }
});

app.use((req, res, next) => {
    // Get auth token from the cookies
    const authToken = req.cookies['AuthToken'];

    // Inject the user to the request
    req.user = authTokens[authToken];

    next();
});

app.get('/dasboard', (req, res) => {
    if (req.user) {
        res.render('protected');
    } else {
        res.render('login', {
            message: 'Please login to continue',
            messageClass: 'alert-danger'
        });
    }
});

const requireAuth = (req, res, next) => {
    if (req.user) {
        next();
    } else {
        res.render('login', {
            message: 'Please login to continue',
            messageClass: 'alert-danger'
        });
    }
};

app.get('/dasboard', requireAuth, (req, res) => {
    res.render('protected');
});

app.listen(3000);
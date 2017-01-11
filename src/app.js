const fs            = require('fs');
const path          = require('path');
const { spawnSync } = require('child_process');
const cors          = require('cors');
const bodyParser    = require('body-parser');
const compression   = require('compression');
const cookieParser  = require('cookie-parser');
const express       = require('express');
const https         = require('https');
const morgan        = require('morgan');
const config        = require('../config');
const controllers   = require('./controllers');
const models        = require('./models');
const startSSE      = require('./sseServer');
const logger        = require('./lib/log');
const { pp }        = require('./lib/utils');
const APIError      = require('./errors/APIError');

const log = logger(module);

const app = express();

app.locals.config = config;
app.locals.models = models;

/**
 * Middlewares
 */
app.use(cors({
    allowedHeaders: ['content-type', 'Authorization'],
    credentials   : true,
    exposedHeaders: ['device', 'point', 'pointName', 'event', 'eventName'],
    origin        : true
}));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(compression());

/**
 * Routes
 */
app.use(controllers);

/**
 * Error handling
 */

// 404
app.use((req, res, next) => {
    next(new APIError(404, 'Not Found'));
});

// Internal error
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    /* istanbul ignore next */
    if (!(err instanceof APIError)) {
        console.log(err.stack);
    } else {
        log.error(pp(err));
    }

    res
        .status(err.status || 500)
        .send(err.toJSON ? err.toJSON() : JSON.stringify(err))
        .end();
});

app.start = () => {
    const sslFilesPath = {
        key : './ssl/server-key.pem',
        cert: './ssl/server-crt.pem',
        ca  : './ssl/ca-crt.pem'
    };

    if (!fs.existsSync('./ssl/server-key.pem') ||
        !fs.existsSync('./ssl/server-crt.pem') ||
        !fs.existsSync('./ssl/ca-crt.pem')) {
        const sslConfigScript = path.join(__dirname, '..', 'scripts', 'sslConfig');

        const sslConfig = spawnSync('node', [ sslConfigScript ], {
            env: {
                RANDOM_SSL_PASSWORD: 1
            },
            shell: true
        });

        console.log(sslConfig.stdout.toString());
    }

    if (config.env === 'test') {
        sslFilesPath.key  = sslFilesPath.key.replace('./ssl/', './ssl/test/');
        sslFilesPath.cert = sslFilesPath.cert.replace('./ssl/', './ssl/test/');
        sslFilesPath.ca   = sslFilesPath.ca.replace('./ssl/', './ssl/test/');
    }

    const server = https.createServer({
        key               : fs.readFileSync(sslFilesPath.key),
        cert              : fs.readFileSync(sslFilesPath.cert),
        ca                : fs.readFileSync(sslFilesPath.ca),
        requestCert       : true,
        rejectUnauthorized: false
    }, app);

    return new Promise((resolve, reject) => {
        models.loadModels().then(() => {
            log.info('Models loaded');

            server.listen(config.http.port, config.http.hostname, (err) => {
                /* istanbul ignore if */
                if (err) {
                    return reject(err);
                }

                log.info('Server is listening %s:%d', config.http.host, config.http.port);
                startSSE(server, app);
                resolve();
            });
        });
    });
};

// Start the application
/* istanbul ignore if */
if (require.main === module) {
    app
        .start()
        .catch(err => log.error(err));
}

module.exports = app;

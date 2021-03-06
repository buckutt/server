const express                      = require('express');
const Promise                      = require('bluebird');
const logger                       = require('../lib/log');
const modelParser                  = require('../lib/modelParser');
const { embedParser, embedFilter } = require('../lib/embedParser');
const dbCatch                      = require('../lib/dbCatch');

const log = logger(module);

/**
 * Create controller. Handles creating one element, or multiple.
 */
const router = new express.Router();

router.post('/:model/', (req, res, next) => {
    log.info(`Create ${req.params.model} ${JSON.stringify(req.body)}`, req.details);

    let insts;

    if (Array.isArray(req.body)) {
        // Multiple is
        insts = req.body.map(data => new req.Model(data));
    } else {
        // Only one instance
        insts = [new req.Model(req.body)];
    }

    // Embed multiple relatives
    const withRelated = (req.query.embed) ? embedParser(req.query.embed) : [];
    const embedFilters = (req.query.embed) ?
        req.query.embed.filter(rel => rel.required).map(rel => rel.embed) :
        [];

    Promise.all(insts.map(inst => inst.save()))
        .then(results => req.Model
            .where('id', 'in', results.map(i => i.id))
            .fetchAll({ withRelated }))
        .then(results => embedFilter(embedFilters, results.toJSON()))
        .then((results) => {
            req.app.locals.modelChanges.emit(
                'data',
                'create',
                modelParser.modelsNames[req.params.model],
                { from: null, to: results }
            );

            res
                .status(200)
                .json((results.length === 1) ? results[0] : results)
                .end();
        })
        .catch(err => dbCatch(module, err, next));
});

router.param('model', modelParser);

module.exports = router;

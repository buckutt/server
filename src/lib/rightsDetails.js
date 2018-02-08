const config = require('../../config');

module.exports = (user, pointId) => {
    const now    = new Date();
    const result = { sell: false, reload: false, admin: false };

    /* istanbul ignore if */
    if (!user || !user.rights) {
        return result;
    }

    for (const right of user.rights) {
        if (right.period.start <= now && right.period.end > now &&
            right.point_id === pointId) {
            const configRight = config.rights[right.name];

            if (configRight && right.name === 'admin') {
                result.admin = true;
            }

            if (configRight && configRight.sell) {
                result.sell = true;
            }

            if (configRight && configRight.reload) {
                result.reload = true;
            }
        }
    }

    return result;
};

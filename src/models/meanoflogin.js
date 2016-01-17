import thinky from '../thinky';

const type = thinky.type;

const MeanOfLogin = thinky.createModel('MeanOfLogin', {
    // Optional => not specified in bodies but generated by RethinkDB
    id       : type.string().optional(),
    type     : type.string().enum('etuId', 'etuMail'),
    // String or Number
    data     : type.any(),
    createdAt: type.date().default(new Date()),
    editedAt : Date,
    isRemoved: type.boolean().default(false),
    // Force Thinky to show thoses additional fields that would be cut by enforce_extra
    userId   : type.string().optional()
}, {
    enforce_missing: true,
    enforce_extra  : 'remove',
    enforce_type   : 'strict'
});

MeanOfLogin.pre('save', function (next) {
    this.editedAt = new Date();
    next();
});

MeanOfLogin.ensureIndex('type');
MeanOfLogin.ensureIndex('createdAt');
MeanOfLogin.ensureIndex('editedAt');

MeanOfLogin.associate = models => {
    models.MeanOfLogin.belongsTo(models.User, 'user', 'userId', 'id');
};

export default MeanOfLogin;

import thinky from '../lib/thinky';

const type = thinky.type;

const Event = thinky.createModel('Event', {
    // Optional => not specified in bodies but generated by RethinkDB
    id       : type.string().optional(),
    name     : String,
    createdAt: type.date().default(new Date()),
    editedAt : Date,
    isRemoved: type.boolean().default(false)
}, {
    enforce_missing: true,
    enforce_extra  : 'remove',
    enforce_type   : 'strict'
});

Event.pre('save', function (next) {
    this.editedAt = new Date();
    next();
});

Event.ensureIndex('name');
Event.ensureIndex('createdAt');
Event.ensureIndex('editedAt');

Event.associate = models => {
    models.Event.hasMany(models.Period, 'periods', 'id', 'Event_id');
};

export default Event;

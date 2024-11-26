const { Schema, model } = require('mongoose');

const jobSchema = new Schema({
    GuildID: { type: String, required: true },
    LogChannel: { type: String, required: true },
    JobChannel: { type: String, required: true },
    StaffRole: { type: String, required: true },
    Jobs: [
        {
            JobName: { type: String, required: true },
            ThreadID: { type: String, required: true },
            MessageID: { type: String, required: true },
            StaffRole: { type: String, required: true },
            Status: { type: String, required: true },
            Users: [
                {
                    Status: { type: String, default: "Bekleniyor..", required: true },
                    UserID: { type: String, required: true },
                    JobMessageID: { type: String, required: true },
                    LogMessageID: { type: String, required: true }
                }
            ]
        }
    ]
});

module.exports = model('job', jobSchema);
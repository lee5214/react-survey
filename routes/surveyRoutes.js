const _ = require('lodash');
const Path = require('path-parser');
const {URL} = require('url');

const mongoose = require('mongoose');
const requireLogin = require('../middlewares/requireLogin');
const requireCredits = require('../middlewares/requireCredits');
const Mailer = require('../servers/Mailer');
const surveyTemplate = require('../servers/emailTemplates/surveyTemplate');

//could require directly, this is for test reasons
const Survey = mongoose.model('surveys');
module.exports = app => {
  app.get('/api/surveys',requireLogin, async(req,res) => {
    const surveys = await Survey.find({_user:req.user.id}).select({
      recipients:false
    })
    res.send(surveys)
  })

  app.get('/api/surveys/:surveyId/:choice', (req, res) => {
    res.send('survey received. thanks');
  });

  app.post('/api/surveys/webhooks', (req, res) => {
    const p = new Path('/api/surveys/:surveyId/:choice');
    //original way without lodash chain function
    // const events = _.map(req.body, (event) => {
    //   const pathname = new URL(event.url).pathname;
    //   const match = p.test(pathname);
    //   if (match) {
    //     return {
    //       email: event.email,
    //       surveyId: match.surveyId,
    //       choice: match.choice,
    //     };
    //   }
    //
    // });
    // const compactEvents = _.compact(events)
    // const uniqueEvents = _.uniqBy(compactEvents,'email','surveyId')
    _.chain(req.body)
     .map(({email, url}) => {
       const pathname = new URL(url).pathname;
       const match = p.test(pathname);
       if (match) {
         return {
           email: email,
           surveyId: match.surveyId,
           choice: match.choice,
         };
       }
       console.log(url, email);
     })
     .compact()
     .uniqBy('email', 'surveyId')
     .each(({surveyId, email, choice}) => {
       Survey.updateOne(
         {
           _id: surveyId, //_id is id in mango, id is id in mongoose, use _id for safe everywhere
           recipients: {
             $elemMatch: {email: email, responded: false},
           },
         },
         {
           $inc: {[choice]: 1},
           $set: {'recipients.$.responded': true},
           lastResponded: new Date(),
         },
       ).exec();
     })
     .value();
    res.send({});//sendgrid doesn't care response
  });

  app.post('/api/surveys', requireLogin, requireCredits, async (req, res) => {
    const {title, subject, body, recipients} = req.body;
    console.log(recipients);
    const survey = new Survey({
      title: title,
      body: body,
      subject: subject,
      recipients: recipients.split(',').map(email => ({email: email.trim()})), //means an array of data using schemas
      _user: req.user.id, //auto generated by mongoose model
      dateSent: Date.now(),
    });
    //send an email
    const mailer = new Mailer(survey, surveyTemplate(survey));
    try {
      await mailer.send();
      await survey.save();
      req.user.credits -= 1;
      const user = await req.user.save();

      res.send(user);
    } catch (err) {
      res.status(422).send(err);
    }

  });
};
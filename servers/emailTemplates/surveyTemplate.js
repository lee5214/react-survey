const keys = require('../../config/keys');

module.exports = (survey) => {

  //use `` !
  return `
    <html>
        <body>
          <div style="text-align:center;">
          <h3>I'd like your answer</h3>
          <p>Please answer the following question:</p>
          <p>${survey.body}</p>
            <div>
                <a href="/api/surveys/${survey.id}/yes">Yes</a>
                <a href="/api/surveys/${survey.id}/no">No</a>
            </div>  
          </div>
        </body>
    
    </html>
    `
    ;
};

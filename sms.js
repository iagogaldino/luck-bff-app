const request = require("request");

function sendSMS(phone, message) {
  if (!phone) { return console.log('telefone nao informado'); }
  if (!message) { return console.log('message nao informada'); }
  const options = {
    method: "POST",
    url: "https://sms.comtele.com.br/api/v2/send",
    headers: {
      "content-type": "application/json",
      "auth-key": "09a9e514-d535-4197-9c53-3a7c7163ad55",
    },
    body: `{"Sender":"sender_id","Receivers":"[${phone}]","Content":"${message}"}`,
  };

  
  request(options, function (error, response, body) {
    if (error) throw new Error(error);

    console.log(body);
    return body;
  });
}
// sendSMS('74988420307', `Petiscaria Movimento:\n Código para entrar em sua conta: 1234.`);
module.exports = sendSMS;

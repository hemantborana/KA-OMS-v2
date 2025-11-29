export function sendWebPushNotification(partyName: string) {
  const apiKey = 'b285a62d89f9a1576f806016b692f5b4';
  const token = '98413';

  const payload = {
    badge:'https://i.ibb.co/spDFy1wW/applogo-1.png',
    title: 'KA OMS v2',
    message: `New Order for ${partyName}`,
    target_url: 'https://ka-oms-v2.netlify.app/',
    icon: 'https://i.ibb.co/spDFy1wW/applogo-1.png'
  };

  fetch('https://api.webpushr.com/v1/notification/send/all', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'webpushrKey': apiKey,
      'webpushrAuthToken': token
    },
    body: JSON.stringify(payload)
  })
  .then(response => {
    if (!response.ok) {
        console.error('Webpushr API response not OK', response.status, response.statusText);
        response.json().then(data => console.error('Webpushr error body:', data));
    }
    return response.json();
  })
  .then(data => console.log('Notification sent:', data))
  .catch(error => console.error('Error sending notification:', error));
}
